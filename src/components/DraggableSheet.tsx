import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View,
  type LayoutChangeEvent, type ViewStyle,
} from 'react-native'
import { colors, radius } from '../theme'

const SCREEN_H = Dimensions.get('window').height

/**
 * Bottom sheet that can be flicked/dragged down to dismiss — the behaviour every
 * picker-style sheet should share. A grabber region at the top owns the pan gesture
 * so inner buttons/scrolls stay tappable. Children supply the sheet body (the white
 * rounded container + handle are provided).
 *
 * The Modal deliberately uses `animationType="none"`: letting the OS slide the modal
 * would animate the *backdrop* up from the bottom too, and would run a second,
 * competing animation on top of the drag transform (which made drag-to-close land
 * inconsistently). Instead one Animated.Value drives everything — the sheet's
 * translateY, and the backdrop opacity interpolated from it, so the scrim fades in
 * as the sheet rises and fades back out under your finger as you drag it away.
 */
export function DraggableSheet({
  visible, onClose, children, contentStyle,
}: {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  contentStyle?: ViewStyle
}) {
  // Distance the sheet travels. Starts as a full-screen guess and tightens to the
  // real height on first layout, so the exit always clears the screen exactly —
  // the old hardcoded 700 left a sliver visible on tall devices.
  const height = useRef(SCREEN_H)
  const translateY = useRef(new Animated.Value(SCREEN_H)).current
  // Keep the latest onClose so the once-created PanResponder never calls a stale one.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // Kept mounted through the exit animation, then torn down.
  const [mounted, setMounted] = useState(visible)

  const animateOut = useCallback(() => {
    Animated.timing(translateY, {
      toValue: height.current, duration: 200, useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onCloseRef.current()
    })
  }, [translateY])

  useEffect(() => {
    if (visible) {
      setMounted(true)
      translateY.setValue(height.current)
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true, bounciness: 0, speed: 14,
      }).start()
    } else if (mounted) {
      Animated.timing(translateY, {
        toValue: height.current, duration: 200, useNativeDriver: true,
      }).start(({ finished }) => { if (finished) setMounted(false) })
    }
  }, [visible, mounted, translateY])

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height
    if (h > 0) height.current = h
  }, [])

  const pan = useRef(
    PanResponder.create({
      // Only claim the gesture for a downward drag (lets horizontal/tap pass through).
      // No *Capture* variant on purpose: children get first refusal, so an inner
      // ScrollView keeps winning touches that start on it.
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy) },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.65) {
          animateOut()
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start()
        }
      },
    }),
  ).current

  // Scrim tracks the sheet: fully dark when seated, clear when fully dismissed.
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_H],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={animateOut}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
      </Animated.View>
      {/* Pan handlers on the whole sheet (Instagram-style): dragging the handle,
          title or any padding pulls the sheet down. Inner ScrollViews still win
          the gesture for touches that start on them, so lists keep scrolling. */}
      <Animated.View
        {...pan.panHandlers}
        onLayout={onLayout}
        style={[styles.sheet, contentStyle, { transform: [{ translateY }] }]}
      >
        <View style={styles.grabber}>
          <View style={styles.handle} />
        </View>
        {children}
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
