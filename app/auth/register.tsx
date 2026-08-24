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
import { colors, fonts, typography } from '../../src/theme'

const phoneRegex = /^[6-9]\d{9}$/

const schema = z.object({
  name:     z.string().min(2, 'Enter your full name'),
  email:    z.email('Enter a valid email'),
  phone:    z.string().regex(phoneRegex, 'Enter a 10-digit Indian mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type Fields = z.infer<typeof schema>

export default function RegisterScreen() {
  const headerOffset = useHeaderOffset()
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)

  const [form, setForm] = useState<Fields>({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const update = (k: keyof Fields) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const fe: typeof errors = {}
      for (const i of parsed.error.issues) fe[i.path[0] as keyof Fields] = i.message
      setErrors(fe)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const payload = {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      }
      const { data } = await authApi.register(payload)
      await setSession(data.accessToken, data.refreshToken, data.user)
      router.replace('/')
    } catch (e: unknown) {
      const msg = extractError(e) || 'Registration failed. Try again.'
      appAlert('Registration failed', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Create account' }} />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerOffset} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}><Ionicons name="person-add-outline" size={28} color={colors.brand} /></View>
          <Text style={styles.heading}>Create your account</Text>
          <View style={styles.accentBar} />
          <Text style={styles.sub}>Join PropFind to post listings or save favourites.</Text>

          <FormField label="Full name" value={form.name} onChangeText={update('name')} error={errors.name} placeholder="Asha Rao" />
          <FormField label="Email" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email} placeholder="you@example.com" />
          <FormField label="Mobile (optional)" value={form.phone ?? ''} onChangeText={update('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} placeholder="98XXXXXXXX" />
          <FormField label="Password" value={form.password} onChangeText={update('password')} secureTextEntry autoCapitalize="none" error={errors.password} placeholder="At least 8 characters" />

          <PrimaryButton label="Create account" onPress={submit} loading={submitting} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <Pressable><Text style={styles.link}>Sign in</Text></Pressable>
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
  sub:        { ...typography.body, marginTop: 12, marginBottom: 24 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { ...typography.body },
  link:       { ...typography.body, fontFamily: fonts.bold, color: colors.brand },
})
