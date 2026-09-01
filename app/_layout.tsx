import { useEffect } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { Text } from '../src/components/Text'
import { Stack, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'
import { useAuthStore } from '../src/store/authStore'
import { useReduceMotion } from '../src/lib/useReduceMotion'
import { BLEND_FADE_PX, blendScrollY, useStatusBarBlendHeight } from '../src/lib/statusBarBlend'
import { AppAlertHost } from '../src/components/AppAlert'
import { colors, fonts, typography } from '../src/theme'

// Make Plus Jakarta Sans the default family for every <Text> so screens we
// haven't restyled yet still pick up the new typeface. Headings/buttons override
// with the bold/extra families via the theme presets.
const TextWithDefault = Text as unknown as { defaultProps?: { style?: object } }
TextWithDefault.defaultProps = TextWithDefault.defaultProps ?? {}
TextWithDefault.defaultProps.style = [
  TextWithDefault.defaultProps.style,
  { fontFamily: fonts.regular },
]

// Hold the splash until the font assets are ready (avoids a flash of system font).
void SplashScreen.preventAutoHideAsync()

// Error monitoring (OWASP A09). Inert unless EXPO_PUBLIC_SENTRY_DSN is set,
// and disabled in dev (__DEV__) so only release/OTA builds report.
// Set the DSN as an EAS env var: `eas env:create --name EXPO_PUBLIC_SENTRY_DSN ...`
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV ?? 'production',
    enabled: !__DEV__,
    tracesSampleRate: 0, // perf tracing off — stay within free tier
  })
}

/**
 * Opaque band behind the OS status bar.
 *
 * Expo SDK 54+ forces edge-to-edge on Android, so the status bar is always
 * translucent and `StatusBar backgroundColor` is ignored — scrolled content
 * runs under the clock and battery icons and collides with them. Painting our
 * own band on top of everything keeps the app visually separate from the
 * system bar on every screen, present and future.
 *
 * One screen opts out while it is focused: home, whose photo hero is meant to
 * run edge-to-edge under the clock (see `useStatusBarBlend`). There the band
 * starts fully transparent and fades in over the last `BLEND_FADE_PX` of the
 * hero, so it is solid brand at the exact moment the hero clears the top and
 * ivory page content would otherwise slide under the glyphs. Every other
 * screen leaves `blendHeight` null and gets the plain opaque band.
 */
function StatusBarBackdrop() {
  const insets = useSafeAreaInsets()
  const blendHeight = useStatusBarBlendHeight()

  // The artwork stops covering the status bar once it has scrolled up by its
  // own height minus the band — that offset is where the band must be solid.
  const solidAt = blendHeight === null ? 0 : Math.max(blendHeight - insets.top, 1)
  const opacity =
    blendHeight === null
      ? 1
      : blendScrollY.interpolate({
          inputRange: [Math.max(solidAt - BLEND_FADE_PX, 0), solidAt],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })

  return (
    <Animated.View
      style={[styles.statusBarBackdrop, { height: insets.top, opacity }]}
      pointerEvents="none"
    />
  )
}

function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate)
  const reduceMotion = useReduceMotion()

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  // Keep the splash up until fonts resolve (or fail) — never block forever.
  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      {/* Light glyphs throughout — the band below is dark, and where it fades
          out (home's hero) the artwork under it is a dark forest scrim. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.brand },
          headerTintColor: '#fff',
          // Native-stack's headerTitleStyle only honours font family/size/colour,
          // so the shared Text (src/components/Text.tsx) never applied here.
          headerTitle: ({ children }) => <Text style={styles.headerTitle}>{children}</Text>,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="post"   options={{ headerShown: false }} />
        {/* Filters paints its own brand header, so the stack header is off.
            Motion, deliberately not left to `presentation` alone: react-native-screens
            documents that "modal" on Android is EQUIVALENT TO PUSH, so the default
            slid this screen in horizontally like a pushed page — while its header
            offers a ✕ (dismiss), not a ← (back). Enter and exit must share a path,
            and that path has to match the affordance, so it slides from the bottom
            and is dismissed downward by gesture or by ✕.
            Under Reduce Motion the vertical travel becomes a cross-fade: the same
            state change, without the vestibular movement. */}
        <Stack.Screen
          name="filters"
          options={{
            // NO `presentation` here, deliberately. A modal presentation wraps the
            // screen in a native modal container on Android whose dismissal is not
            // driven by `animation`, so the exit snapped shut while the entrance
            // animated. As a plain stack screen the same `slide_from_bottom` plays
            // forwards on push and reverses on pop — which is the symmetry we want.
            headerShown: false,
            animation: reduceMotion ? 'fade' : 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen name="my-listings" options={{ headerShown: false }} />
        {/* Paints its own brand header, like the other full-bleed screens. */}
        <Stack.Screen name="compare" options={{ headerShown: false }} />
        <Stack.Screen name="emi-calculator" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      {/* Last sibling so it paints above everything the Stack renders. */}
      <StatusBarBackdrop />
      <AppAlertHost />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  headerTitle: { ...typography.navTitle, color: '#fff' },
  statusBarBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    // zIndex only — NO elevation. Elevation on Android casts a Material shadow,
    // and at a high value it spills a dark gradient onto whatever sits below,
    // which reads as a seam between this band and the header under it.
    zIndex: 100,
    // colors.brand, not brandDark: every self-padding header (saved, profile,
    // bookings) paints its own status-bar area in colors.brand, so the band
    // meets whatever is under it with no seam.
    backgroundColor: colors.brand,
  },
})

// Sentry.wrap adds the error boundary + native crash/touch instrumentation.
// Skip it in Expo Go — the @sentry/react-native native module isn't bundled
// there, so wrapping would red-screen on boot. Dev/preview/prod builds wrap.
const isExpoGo = Constants.executionEnvironment === 'storeClient'
export default isExpoGo ? RootLayout : Sentry.wrap(RootLayout)
