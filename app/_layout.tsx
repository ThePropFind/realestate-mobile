import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Text } from '../src/components/Text'
import { Stack, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
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
import { AppAlertHost } from '../src/components/AppAlert'
import { colors, fonts } from '../src/theme'

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

function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate)

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
      <StatusBar style="dark" />
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
        <Stack.Screen name="my-listings" options={{ headerShown: false }} />
        <Stack.Screen name="emi-calculator" options={{ headerShown: false }} />
      </Stack>
      <AppAlertHost />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: '#fff' },
})

// Sentry.wrap adds the error boundary + native crash/touch instrumentation.
// Skip it in Expo Go — the @sentry/react-native native module isn't bundled
// there, so wrapping would red-screen on boot. Dev/preview/prod builds wrap.
const isExpoGo = Constants.executionEnvironment === 'storeClient'
export default isExpoGo ? RootLayout : Sentry.wrap(RootLayout)
