import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../../src/components/Text'
import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { InfoSheet, type InfoSheetContent } from '../../src/components/InfoSheet'
import { ConfirmSheet } from '../../src/components/ConfirmSheet'
import { useAuthStore } from '../../src/store/authStore'
import { colors, fonts, radius, shadow, typography } from '../../src/theme'

export default function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const clearSession = useAuthStore((s) => s.clearSession)
  // Branded "coming soon" sheet instead of a bare Alert box.
  const [info, setInfo] = useState<InfoSheetContent | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <View style={styles.guestIcon}><Ionicons name="person-circle-outline" size={56} color={colors.brand} /></View>
          <Text style={styles.title}>You're browsing as a guest</Text>
          <Text style={styles.sub}>Sign in to send inquiries and post listings.</Text>
          <Link href="/auth/login" asChild>
            <Pressable style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Sign in</Text></Pressable>
          </Link>
          <Link href="/auth/register" asChild>
            <Pressable style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Create account</Text></Pressable>
          </Link>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.roleChip}>{user?.role}</Text>
      </View>

      <View style={styles.list}>
        <Row icon="home-outline"            label="My Listings"   onPress={() => router.push('/my-listings')} />
        <Row icon="heart-outline"           label="Favourites"     onPress={() => setInfo({
          icon: 'heart-outline', title: 'Favourites',
          body: 'Save the properties you love and find them all here — this is coming soon.',
        })} />
        <Row icon="calendar-outline"        label="Bookings"      onPress={() => router.push('/bookings')} />
        {/* Moved here when Home's quick actions became Buy/Rent/Commercial/Plots */}
        <Row icon="calculator-outline"      label="EMI Calculator" onPress={() => router.push('/emi-calculator')} />
        <Row icon="settings-outline"        label="Settings"       onPress={() => setInfo({
          icon: 'settings-outline', title: 'Settings',
          body: 'Profile and notification settings are coming soon.',
        })} />
        <Row icon="log-out-outline"         label="Sign out"       onPress={() => setSignOutOpen(true)} danger />
      </View>

      <InfoSheet
        visible={info !== null}
        onClose={() => setInfo(null)}
        {...(info ?? { title: '', body: '' })}
      />

      <ConfirmSheet
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        icon="log-out-outline"
        title="Sign out?"
        body="You will need to log in again to send inquiries or post listings."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => void clearSession()}
      />
    </SafeAreaView>
  )
}

function Row({ icon, label, onPress, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.rowIcon, danger && { backgroundColor: '#fde8e8' }]}>
        <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.brand} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  guestIcon:      { width: 96, height: 96, borderRadius: 48, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center' },
  title:          { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 16, textAlign: 'center' },
  sub:            { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  primaryBtn:     { backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8, ...shadow.cta },
  primaryBtnText: { ...typography.button },
  secondaryBtn:   { borderRadius: radius.sm, paddingHorizontal: 28, paddingVertical: 12, marginTop: 10 },
  secondaryBtnText:{ ...typography.button, color: colors.brand },

  header:         { alignItems: 'center', paddingBottom: 30, backgroundColor: colors.brand },
  avatar:         { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadow.card },
  avatarText:     { color: colors.brand, fontFamily: fonts.extra, fontSize: 30 },
  name:           { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, color: colors.white },
  email:          { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  roleChip:       { fontFamily: fonts.bold, fontSize: 10, color: colors.white, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: 10, overflow: 'hidden', letterSpacing: 0.5 },

  list:           { paddingHorizontal: 16, marginTop: 16 },
  row:            { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 13, borderRadius: radius.md, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  rowPressed:     { opacity: 0.7 },
  rowIcon:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center' },
  rowLabel:       { ...typography.label, flex: 1, marginLeft: 12 },
})
