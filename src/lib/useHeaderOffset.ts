import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Native-stack default header heights (we can't read the real one —
// @react-navigation/elements isn't a resolvable dependency here).
const HEADER_H = Platform.OS === 'android' ? 56 : 44

/**
 * Distance from the top of the window to the top of a screen's content — the
 * native-stack header plus the status bar.
 *
 * `KeyboardAvoidingView` needs this as `keyboardVerticalOffset` on any screen
 * that has a header. Its overlap maths uses `frame.y`, which is relative to its
 * *parent* (already below the header), while the keyboard's `screenY` is
 * absolute — so without the offset it under-computes the overlap by exactly the
 * header height and the last fields stay hidden behind the keyboard.
 *
 * Screens with `headerShown: false` (post) must NOT use this — their offset is 0.
 */
export function useHeaderOffset(): number {
  const insets = useSafeAreaInsets()
  return insets.top + HEADER_H
}
