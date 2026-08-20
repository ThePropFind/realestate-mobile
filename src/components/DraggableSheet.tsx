import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo, Animated, Easing, Modal, PanResponder, Pressable, StyleSheet,
  useWindowDimensions, View,
  type GestureResponderHandlers, type LayoutChangeEvent, type PanResponderInstance,
  type ViewStyle,
} from 'react-native'
import { colors, radius } from '../theme'

/**
 * Springs in Apple's terms (damping ratio ζ + response), mapped onto RN's physics config:
 * ω₀ = 2π/response, stiffness = m·ω₀², damping = 2·ζ·m·ω₀, mass = 1.
 *
 * Overshoot is earned, not decorative: a sheet that appeared because you tapped a button
 * had no momentum, so it settles flat (ζ 1.0). A sheet you just dragged did, so the
 * snap-back keeps a little of it (ζ 0.8 / response 0.3 — Apple's own drawer figure).
 */
const ENTER_SPRING = { stiffness: 247, damping: 31, mass: 1, useNativeDriver: true } as const
const RELEASE_SPRING = { stiffness: 438, damping: 33, mass: 1, useNativeDriver: true } as const
/** Sub-pixel settle where it's visible; loose where the sheet is already off-screen, so
 *  the unmount (and onClose) don't wait out a spring tail nobody can see. */
const SEAT_REST = { restDisplacementThreshold: 0.5, restSpeedThreshold: 2 } as const
const EXIT_REST = { restDisplacementThreshold: 4, restSpeedThreshold: 40 } as const
/**
 * Drawer curve (the iOS/Vaul one): a strong ease-out. `Animated.timing` defaults to
 * `Easing.inOut(Easing.ease)`, whose slow start lands on exactly the frames the user
 * is watching — an exit must never begin slowly.
 */
const DRAWER_EASING = Easing.bezier(0.32, 0.72, 0, 1)
const EXIT_MS = 200
const FADE_MS = 200
/** PanResponder reports velocity in px/ms; `Animated.spring` integrates in units/second. */
const VY_TO_SPRING = 1000
/** Cap on the dismissal commit line — see `commitDistance`. */
const MAX_COMMIT_PX = 120

/**
 * Where a flick would coast to if we let it decelerate — Apple's projection function from
 * *Designing Fluid Interfaces*, the same exponential decay scroll uses (not the textbook
 * v²/2a). Written for px/ms in, px out: (v·1000/1000)·d/(1−d).
 */
const DECELERATION = 0.998
const project = (vy: number) => vy * (DECELERATION / (1 - DECELERATION))

/**
 * Progressive resistance past a boundary (Apple's rubber-band curve): the further you
 * pull, the less the sheet follows, asymptotically. A flat multiplier resists evenly,
 * which reads as a slipping surface rather than a stretching one.
 */
const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))

/** OS "Reduce Motion" setting, kept live (users can flip it while the app is open). */
function useReduceMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setReduce(v) })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => { alive = false; sub.remove() }
  }, [])
  return reduce
}

/**
 * Handlers that claim the gesture on touch-*down*. Shared with `SheetGrabZone` so a
 * sheet's own header can drag it — see the responder note on `DraggableSheet`.
 */
const GrabHandlers = createContext<GestureResponderHandlers | null>(null)

/**
 * Wrap a sheet's non-scrolling header (title row, icon, subtitle) in this and it becomes
 * a drag handle for the sheet, exactly like the grabber above it.
 *
 * Needed because a sheet whose body is a ScrollView can't claim every touch (see
 * `dragAnywhere`), which would otherwise leave only the 22px grabber draggable.
 * Interactive children keep working: they sit deeper in the tree, and the responder
 * system offers the gesture to the deepest view first.
 */
export function SheetGrabZone({ children, style }: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  const handlers = useContext(GrabHandlers)
  return <View {...handlers} style={style}>{children}</View>
}

/**
 * Bottom sheet that can be flicked/dragged down to dismiss — the behaviour every
 * picker-style sheet should share. A grabber region at the top owns the pan gesture
 * so inner buttons/scrolls stay tappable. Children supply the sheet body (the white
 * rounded container + handle are provided).
 *
 * The Modal deliberately uses `animationType="none"`: letting the OS slide the modal
 * would animate the *backdrop* up from the bottom too, and would run a second,
 * competing animation on top of the drag transform. Instead one Animated.Value drives
 * everything — the sheet's translateY, and the backdrop opacity derived from it, so the
 * scrim fades in as the sheet rises and fades back out under your finger as you drag.
 *
 * Three things are easy to get wrong here and are load-bearing:
 * - the entrance waits for `onLayout`, because the travel distance is the sheet's own
 *   measured height and guessing it makes the entrance length nondeterministic;
 * - the scrim is mapped over that same measured height, not the screen's, or a short
 *   sheet finishes leaving while the scrim is still ~0.7 opaque and pops at unmount;
 * - the effect is keyed on `visible` alone, since re-running it on internal state
 *   restarted the entrance mid-flight.
 *
 * Release is decided by momentum projection rather than by a distance threshold, and every
 * animation starts from the sheet's live position, so a drag can be grabbed, reversed or
 * re-opened mid-flight without a jump.
 *
 * ── Why the gesture must be claimed on touch-DOWN inside a Modal (bug #60) ──
 * RN's `Modal` puts `onStartShouldSetResponder: () => true` on its own host view, to stop
 * responder events escaping the modal. Nothing deeper claims a touch that lands on plain
 * content (a handle, a title), so the *modal host* becomes the responder. From then on the
 * responder plugin only offers `onMoveShouldSetResponder` to the common ancestor of the
 * responder and the touch target **and its ancestors** (`accumulateTwoPhaseDispatchesSingleSkipTarget`
 * in the renderer) — that ancestor is the modal host, so every view *below* it, this sheet
 * included, is never asked again. A move-only PanResponder inside a Modal is therefore dead
 * unless the touch happens to start on a Pressable, which is precisely what the earlier
 * "drag-to-close is unreliable" reports were: it worked from list rows and buttons, never
 * from the handle.
 *
 * So: `grabPan` claims on touch-down and owns the grabber, any `SheetGrabZone`, and the whole
 * sheet when `dragAnywhere` is set. `bodyPan` keeps the move-only claim for the rest, which
 * still fires for drags that begin on an inner Pressable.
 *
 * `dragAnywhere` is opt-in rather than default because claiming on touch-down also blocks the
 * native responder — an inner ScrollView could not scroll. Sheets with no scrollable content
 * (Info, Confirm) set it; sheets with a list expose their header via `SheetGrabZone` instead.
 */
export function DraggableSheet({
  visible, onClose, children, contentStyle, dragAnywhere = false,
}: {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  contentStyle?: ViewStyle
  /** Let the whole sheet be dragged, not just the grabber. Only for sheets with no
   *  scrollable content inside — see the responder note above. */
  dragAnywhere?: boolean
}) {
  const { height: screenH } = useWindowDimensions()
  const screenHRef = useRef(screenH)
  screenHRef.current = screenH

  const reduceMotion = useReduceMotion()
  const reduceMotionRef = useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

  // Keep the latest onClose so the once-created PanResponder never calls a stale one.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Distance the sheet travels: its own height, since it's bottom-anchored. Held both
  // as a ref (for animation targets) and as an Animated.Value (so the backdrop range
  // stays correct without a re-render on every layout pass).
  const sheetH = useRef(0)
  const travel = useRef(new Animated.Value(screenH)).current

  const translateY = useRef(new Animated.Value(screenH)).current
  // Only moves when Reduce Motion is on: there the sheet fades in place instead of sliding.
  const fade = useRef(new Animated.Value(1)).current

  // Kept mounted through the exit animation, then torn down.
  const [mounted, setMounted] = useState(visible)
  const mountedRef = useRef(visible)
  const setMountedState = useCallback((v: boolean) => { mountedRef.current = v; setMounted(v) }, [])

  // Which value the exit is animating, or null when the sheet isn't leaving.
  const exiting = useRef<'slide' | 'fade' | null>(null)
  // Set between "open requested" and the first layout — the entrance can't start until
  // the sheet has been measured.
  const pendingEnter = useRef(false)
  const dragFrom = useRef(0)

  // JS-side mirror of translateY. With the native driver the JS value goes stale while
  // an animation runs, and a drag has to start from where the sheet actually is — so a
  // grab mid-entrance continues from that point instead of snapping. Costs one event per
  // frame of native-driven animation only (~20 per open), never during a drag.
  const currentY = useRef(screenH)
  useEffect(() => {
    const id = translateY.addListener(({ value }) => { currentY.current = value })
    return () => translateY.removeListener(id)
  }, [translateY])

  const fadeTo = useCallback((toValue: number, done?: (r: { finished: boolean }) => void) => {
    Animated.timing(fade, {
      toValue, duration: FADE_MS, easing: DRAWER_EASING, useNativeDriver: true,
    }).start(done)
  }, [fade])

  /** Springs the sheet to its resting position from wherever it currently is. */
  const seat = useCallback(() => {
    Animated.spring(translateY, { toValue: 0, ...ENTER_SPRING, ...SEAT_REST }).start()
  }, [translateY])

  /**
   * How far the projected resting point has to be for a release to mean "dismiss".
   * Halfway is the honest nearest-snap line between seated and gone, but on a tall sheet
   * (Notifications caps at half the screen) half is a 260px haul, so it's capped —
   * projection still decides, the commit line just stays reachable by a slow drag.
   */
  const commitDistance = useCallback(
    () => Math.min((sheetH.current || screenHRef.current) * 0.5, MAX_COMMIT_PX),
    [],
  )

  /**
   * The single owner of the exit. `velocity` (px/ms) marks a gesture dismissal, which
   * continues the finger's momentum; `notify` fires onClose once the sheet has left
   * (omit it when the parent already set `visible` to false).
   */
  const runExit = useCallback((
    { velocity, notify = false }: { velocity?: number; notify?: boolean } = {},
  ) => {
    if (exiting.current) return
    const target = sheetH.current || screenHRef.current
    const done = ({ finished }: { finished: boolean }) => {
      exiting.current = null
      if (!finished) return // interrupted by a re-open — stay mounted
      setMountedState(false)
      if (notify) onCloseRef.current()
    }
    if (velocity !== undefined) {
      // A drag dismissal slides even under Reduce Motion: the movement is the user's
      // own, and cutting it mid-gesture is more jarring than finishing it.
      exiting.current = 'slide'
      Animated.spring(translateY, {
        toValue: target, velocity: velocity * VY_TO_SPRING, ...RELEASE_SPRING, ...EXIT_REST,
      }).start(done)
    } else if (reduceMotionRef.current) {
      exiting.current = 'fade'
      fadeTo(0, done)
    } else {
      exiting.current = 'slide'
      Animated.timing(translateY, {
        toValue: target, duration: EXIT_MS, easing: DRAWER_EASING, useNativeDriver: true,
      }).start(done)
    }
  }, [fadeTo, setMountedState, translateY])

  // The PanResponder is created once, so it reaches the current runExit through a ref.
  const runExitRef = useRef(runExit)
  runExitRef.current = runExit

  /** Backdrop tap / Android back: play the exit, then tell the parent. */
  const dismiss = useCallback(() => runExit({ notify: true }), [runExit])

  useEffect(() => {
    if (visible) {
      // Re-opened mid-exit: retarget from the current position instead of restarting,
      // so a fast close→open doesn't jump back to the start.
      if (exiting.current) {
        if (exiting.current === 'fade') fadeTo(1)
        else seat()
        return
      }
      setMountedState(true)
      // Park off-screen (the screen height always clears a bottom-anchored sheet) until
      // onLayout measures the sheet; the entrance starts from there.
      translateY.setValue(screenHRef.current)
      pendingEnter.current = true
    } else if (mountedRef.current) {
      runExit()
    }
    // Keyed on `visible` only. Everything else this reads lives in a ref precisely so
    // that internal state changes can't re-enter and restart the animation.
  }, [visible, fadeTo, runExit, seat, setMountedState, translateY])

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height
    if (h <= 0) return
    sheetH.current = h
    travel.setValue(h)
    if (!pendingEnter.current) return
    pendingEnter.current = false
    if (reduceMotionRef.current) {
      // Reduce Motion: no positional slide. The sheet sits where it belongs and both it
      // and the scrim fade up — movement dropped, the state change still explained.
      translateY.setValue(0)
      fade.setValue(0)
      fadeTo(1)
    } else {
      fade.setValue(1)
      translateY.setValue(h)
      seat()
    }
  }, [fade, fadeTo, seat, translateY, travel])

  /**
   * Both responders share every handler; they differ only in when they claim the gesture.
   * `claimOnStart` takes it on touch-down (the only claim that survives RN's Modal — see
   * the note above); the move-only variant is kept for drags that begin on a Pressable.
   */
  const createPan = (claimOnStart: boolean) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => claimOnStart && exiting.current === null,
      // Only claim the gesture for a downward drag (lets horizontal/tap pass through),
      // and never once the sheet is already leaving.
      // No *Capture* variant on purpose: children get first refusal, so an inner
      // ScrollView keeps winning touches that start on it.
      onMoveShouldSetPanResponder: (_, g) =>
        exiting.current === null && g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        // Halt any entrance in flight and drag on from exactly where it had got to.
        dragFrom.current = currentY.current
        translateY.stopAnimation()
      },
      onPanResponderMove: (_, g) => {
        const next = dragFrom.current + g.dy
        // Dragging up past the seated position resists progressively instead of
        // stopping dead against an invisible wall.
        translateY.setValue(next > 0 ? next : rubberband(next, sheetH.current || screenHRef.current))
      },
      onPanResponderRelease: (_, g) => {
        // Decide on where the gesture was *going*, not where the finger happened to stop:
        // project the release velocity forward and pick the nearer resting place. One rule
        // replaces a distance threshold and a flick threshold, and it gets the reversal
        // case right for free — drag far, flick back up, and the projection lands short,
        // so the sheet seats instead of dismissing against the user's intent.
        const projected = currentY.current + project(g.vy)
        if (projected > commitDistance()) {
          runExitRef.current({ velocity: Math.max(g.vy, 0), notify: true })
        } else {
          // Snap back carrying the release velocity, so letting go mid-drag continues the
          // motion instead of restarting it from a standstill.
          Animated.spring(translateY, {
            toValue: 0, velocity: g.vy * VY_TO_SPRING, ...RELEASE_SPRING, ...SEAT_REST,
          }).start()
        }
      },
      // Gesture stolen (a native child, an incoming call): never leave the sheet
      // stranded half-open with a half-faded scrim.
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, ...RELEASE_SPRING, ...SEAT_REST }).start()
      },
    })

  // Created once. Every handler above reads refs only, so neither can go stale.
  const pans = useRef<{ body: PanResponderInstance; grab: PanResponderInstance } | null>(null)
  if (pans.current === null) pans.current = { body: createPan(false), grab: createPan(true) }
  const { body: bodyPan, grab: grabPan } = pans.current

  // Scrim tracks the sheet: opaque when seated, clear when fully dismissed — over the
  // sheet's own travel distance, so it reaches 0 exactly as the sheet clears the screen.
  const backdropOpacity = useMemo(() => Animated.multiply(
    fade,
    Animated.divide(translateY, travel).interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  ), [fade, translateY, travel])

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>
      {/* The grabber — and any SheetGrabZone among the children — claims on touch-down;
          the sheet itself keeps the move-only claim unless `dragAnywhere`. Inner
          ScrollViews still win the touches that start on them, so lists keep scrolling. */}
      <Animated.View
        {...(dragAnywhere ? grabPan : bodyPan).panHandlers}
        onLayout={onLayout}
        style={[styles.sheet, contentStyle, { opacity: fade, transform: [{ translateY }] }]}
      >
        <View {...grabPan.panHandlers} style={styles.grabber}>
          <View style={styles.handle} />
        </View>
        <GrabHandlers.Provider value={grabPan.panHandlers}>{children}</GrabHandlers.Provider>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet:    { marginTop: 'auto', backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingBottom: 32 },
  grabber:  { alignSelf: 'stretch', alignItems: 'center', paddingTop: 12, paddingBottom: 6, marginHorizontal: -20 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
})
