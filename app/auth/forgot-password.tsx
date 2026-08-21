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
import { FormField } from '../../src/components/FormField'
import { PrimaryButton } from '../../src/components/PrimaryButton'
import { colors, fonts } from '../../src/theme'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export default function ForgotPasswordScreen() {
  const headerOffset = useHeaderOffset()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const parsed = schema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setError(undefined)
    setSubmitting(true)
    try {
      await authApi.forgotPassword(parsed.data.email)
    } catch {
      // Backend always returns a neutral response; proceed regardless to avoid
      // leaking whether an account exists (mirrors the web flow).
    } finally {
      setSubmitting(false)
      router.push({ pathname: '/auth/reset-password', params: { email: parsed.data.email } })
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Reset password' }} />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerOffset} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}><Ionicons name="lock-closed-outline" size={28} color={colors.brand} /></View>
          <Text style={styles.heading}>Reset your password</Text>
          <View style={styles.accentBar} />
          <Text style={styles.sub}>
            Enter the email address associated with your account and we&apos;ll send you a one-time password.
          </Text>

          <FormField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            error={error}
            placeholder="you@example.com"
          />

          <PrimaryButton label="Send OTP" onPress={submit} loading={submitting} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <Link href="/auth/login" asChild>
              <Pressable><Text style={styles.link}>Sign in</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  flex:       { flex: 1 },
  scroll:     { padding: 22, paddingTop: 28 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heading:    { fontFamily: fonts.extra, fontSize: 26, color: colors.ink },
  accentBar:  { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 10 },
  sub:        { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 12, marginBottom: 24, lineHeight: 20 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14 },
  link:       { fontFamily: fonts.bold, color: colors.brand, fontSize: 14 },
})
