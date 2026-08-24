import { useCallback, useEffect } from 'react'
import { Animated } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { create } from 'zustand'

/**
 * Status-bar band blending.
 *
 * The opaque brand band behind the OS status bar is rendered ONCE, in the root
 * layout (`StatusBarBackdrop`), so it covers every screen present and future.
 * Home's hero is the one place that wants the artwork to run all the way up
 * under the clock instead — so the band has to be told, from a screen, to get
 * out of the way and then come back on scroll.
 *
 * Rather than prop-drill through the tab navigator, the screen publishes two
 * things here: how tall its blended artwork is, and its live scroll offset.
 * The band subscribes and fades itself in over the last stretch of that
 * artwork, so it reaches full opacity exactly as the artwork clears the top.
 */

/**
 * Scroll offset of the blending screen. Module-level and driven by
 * `Animated.event` with the native driver, so the fade runs on the UI thread
 * and never lags the finger.
 */
export const blendScrollY = new Animated.Value(0)

/** How much scroll the band fades in over, ending as the artwork clears the top. */
export const BLEND_FADE_PX = 72

interface BlendState {
  /** Height of the blended artwork from the very top of the window, or null = plain opaque band. */
  height: number | null
  setHeight: (height: number | null) => void
}

const useBlendStore = create<BlendState>((set) => ({
  height: null,
  setHeight: (height) => set({ height }),
}))

/** Read by the root layout's band. */
export function useStatusBarBlendHeight(): number | null {
  return useBlendStore((s) => s.height)
}

/**
 * Call from a screen whose artwork should run under the status bar. Active only
 * while the screen is focused — blurring (tab switch, push) restores the opaque
 * band immediately, so no other screen ever inherits the transparency.
 */
export function useStatusBarBlend(height: number): void {
  const setHeight = useBlendStore((s) => s.setHeight)

  useFocusEffect(
    useCallback(() => {
      setHeight(height)
      return () => setHeight(null)
    }, [height, setHeight]),
  )

  // Belt and braces: a hard unmount (e.g. Fast Refresh) skips the blur cleanup.
  useEffect(() => () => setHeight(null), [setHeight])
}
