import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View,
} from 'react-native'
import { Text } from '../src/components/Text'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FormField } from '../src/components/FormField'
import { appAlert } from '../src/components/AppAlert'
import { userApi } from '../src/lib/api'
import { useAuthStore } from '../src/store/authStore'
import { colors, fonts, radius, shadow, typography } from '../src/theme'
import type { Me } from '../src/types'

const BRAND = colors.brand

/**
 * Settings — the screen that sat behind a "coming soon" sheet.
 *
 * Scope is deliberately narrow, and the limit is the server's, not the design's:
 * the account has exactly three writable fields (`PATCH /users/me` — name, phone,
 * inquiry-email preference). Email is the login identifier and changing it needs
 * a re-verification flow that does not exist; the password already has one, so
 * it links out rather than being duplicated here. Anything else would be a
 * control that cannot save.
 */
export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isLoggedIn, hydrated, updateUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notify, setNotify] = useState(true)
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace('/auth/login')
  }, [hydrated, isLoggedIn, router])

  const load = useCallback(async () => {
    try {
      const { data } = await userApi.me()
      setMe(data)
      setName(data.name)
      setPhone(data.phone ?? '')
      setNotify(data.notifyEmailInquiries)
    } catch {
      appAlert('Could not load settings', 'Check your connection and try again.', () => router.back())
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { if (hydrated && isLoggedIn) void load() }, [hydrated, isLoggedIn, load])

  /** Nothing edited means nothing to send — and no reason to enable Save. */
  const dirty =
    me != null &&
    (name.trim() !== me.name || phone.trim() !== (me.phone ?? '') || notify !== me.notifyEmailInquiries)

  const save = async () => {
    const next: { name?: string; phone?: string } = {}
    if (!name.trim()) next.name = 'Your name cannot be empty.'
    // Matches the server's @Pattern and AuthService's phone-vs-email rule — a
    // number that fails here could never be used to sign in anyway.
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      next.phone = 'Enter a valid 10-digit mobile number.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      // Only what actually changed. A PATCH that resends everything is how a
      // field gets clobbered by a stale value from another device.
      const { data } = await userApi.updateMe({
        ...(name.trim() !== me?.name && { name: name.trim() }),
        ...(phone.trim() !== (me?.phone ?? '') && { phone: phone.trim() }),
        ...(notify !== me?.notifyEmailInquiries && { notifyEmailInquiries: notify }),
      })
      setMe(data)
      // Keep the cached session user in step so Profile's header updates too.
      await updateUser({ name: data.name, phone: data.phone })
      appAlert('Settings saved', 'Your account has been updated.')
    } catch (e: unknown) {
      appAlert('Could not save', extractError(e) ?? 'Please try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = () => {
    // Reuses the existing OTP reset flow rather than adding a second password
    // path: one code to keep correct, and the user is already signed in so the
    // email is prefilled on the next screen.
    router.push({ pathname: '/auth/forgot-password', params: { email: me?.email ?? '' } })
  }

  if (!hydrated || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}><ActivityIndicator color={BRAND} /></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 28 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel>Profile</SectionLabel>
          <View style={styles.card}>
            <FormField
              label="Full name"
              value={name}
              onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })) }}
              placeholder="Your name"
              maxLength={150}
              error={errors.name}
            />
            <FormField
              label="Mobile number"
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/[^0-9]/g, '')); setErrors((e) => ({ ...e, phone: undefined })) }}
              placeholder="10-digit mobile"
              keyboardType="number-pad"
              maxLength={10}
              error={errors.phone}
            />
            <Text style={styles.hint}>
              Optional and unverified — buyers only see it on listings you post. Leave it blank to remove it.
            </Text>
          </View>

          <SectionLabel>Account</SectionLabel>
          <View style={styles.card}>
            <ReadOnlyRow icon="mail-outline" label="Email" value={me?.email ?? '—'} />
            <Text style={styles.hint}>
              Your email is how you sign in, so it cannot be changed here. Contact support if you need it moved.
            </Text>
            <View style={styles.divider} />
            <ReadOnlyRow icon="person-outline" label="Account type" value={me?.role ?? '—'} />
            <View style={styles.divider} />
            <Pressable onPress={changePassword} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}>
              <Ionicons name="key-outline" size={19} color={BRAND} />
              <Text style={styles.linkLabel}>Change password</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.mutedLight} />
            </Pressable>
          </View>

          <SectionLabel>Notifications</SectionLabel>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchLabel}>Inquiry emails</Text>
                <Text style={styles.hint}>
                  Email me when someone enquires about one of my listings.
                </Text>
              </View>
              <Switch
                value={notify}
                onValueChange={setNotify}
                trackColor={{ false: colors.border, true: BRAND }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.hint, { marginTop: 12 }]}>
              Sign-in codes and password-reset emails are always sent — they keep your account secure.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
          <Pressable
            onPress={save}
            disabled={!dirty || saving}
            style={({ pressed }) => [
              styles.saveBtn,
              (!dirty || saving) && { opacity: 0.5 },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Save changes</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── building blocks ────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Settings</Text>
      <View style={{ width: 22 }} />
    </View>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>
}

function ReadOnlyRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string
}) {
  return (
    <View style={styles.readRow}>
      <Ionicons name={icon} size={19} color={BRAND} />
      <Text style={styles.readLabel}>{label}</Text>
      <Text style={styles.readValue} numberOfLines={1}>{value}</Text>
    </View>
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
  safe:        { flex: 1, backgroundColor: colors.bg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Solid colors.brand, matching my-listings / compare / bookings — the root
  // layout paints the status-bar band in the same colour, so there is no seam.
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: BRAND },
  headerTitle: { ...typography.navTitle, color: '#fff' },

  body:        { padding: 16 },
  section:     { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, lineHeight: 15, color: colors.muted, textTransform: 'uppercase', marginTop: 8, marginBottom: 10 },
  card:        { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: 16, marginBottom: 14, ...shadow.card },

  hint:        { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.mutedLight },
  divider:     { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },

  readRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readLabel:   { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  readValue:   { flex: 1, textAlign: 'right', fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  linkRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkLabel:   { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },

  switchRow:   { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink, marginBottom: 3 },

  footer:      { paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight, ...shadow.raised },
  saveBtn:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: radius.sm, backgroundColor: BRAND, ...shadow.cta },
  saveBtnText: { ...typography.button },
})
