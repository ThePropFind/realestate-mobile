import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Text } from '../../src/components/Text'
import { Link, Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHeaderOffset } from '../../src/lib/useHeaderOffset'
import { Ionicons } from '@expo/vector-icons'
import { z } from 'zod'
import { authApi } from '../../src/lib/api'
import { appAlert } from '../../src/components/AppAlert'
import { useAuthStore } from '../../src/store/authStore'
import { FormField } from '../../src/components/FormField'
import { PrimaryButton } from '../../src/components/PrimaryButton'
import { colors, fonts, radius } from '../../src/theme'

const schema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password:   z.string().min(1, 'Password is required'),
})

export default function LoginScreen() {
  const headerOffset = useHeaderOffset()
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const parsed = schema.safeParse({ identifier, password })
    if (!parsed.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof typeof errors
        fieldErrors[k] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const { data } = await authApi.login(parsed.data)
      await setSession(data.accessToken, data.refreshToken, data.user)
      router.replace('/')
    } catch (e: unknown) {
      const msg = extractError(e) || 'Login failed. Check your credentials.'
      appAlert('Login failed', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Sign in' }} />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerOffset} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}><Ionicons name="log-in-outline" size={30} color={colors.brand} /></View>
          <Text style={styles.heading}>Welcome back</Text>
          <View style={styles.accentBar} />
          <Text style={styles.sub}>Sign in to manage listings and inquiries.</Text>

          <FormField
            label="Email or mobile number"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            error={errors.identifier}
            placeholder="you@example.com or 98XXXXXXXX"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            error={errors.password}
            placeholder="••••••••"
          />

          <Link href="/auth/forgot-password" asChild>
            <Pressable style={styles.forgot}><Text style={styles.link}>Forgot password?</Text></Pressable>
          </Link>

          <PrimaryButton label="Sign in" onPress={submit} loading={submitting} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to PropFind? </Text>
            <Link href="/auth/register" asChild>
              <Pressable><Text style={styles.link}>Create an account</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function extractError(e: unknown): string | null {
  if (typeof e === 'object' && e && 'response' in e) {
    const r = (e as { response?: { data?: { message?: string } } }).response
    return r?.data?.message ?? null
  }
  return null
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  flex:       { flex: 1 },
  scroll:     { padding: 22, paddingTop: 28 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heading:    { fontFamily: fonts.extra, fontSize: 26, color: colors.ink },
  accentBar:  { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 10 },
  sub:        { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 12, marginBottom: 24, lineHeight: 20 },
  forgot:     { alignSelf: 'flex-end', marginBottom: 18, marginTop: 2 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14 },
  link:       { fontFamily: fonts.bold, color: colors.brand, fontSize: 14 },
})
