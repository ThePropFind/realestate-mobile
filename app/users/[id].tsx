import { useEffect, useState } from 'react'
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'react-native'

import { Text } from '../../src/components/Text'
import { ListSkeleton } from '../../src/components/Skeleton'
import { SectionCard } from '../../src/components/property/SectionCard'
import { PropertyMiniCard } from '../../src/components/property/PropertyMiniCard'
import { userApi } from '../../src/lib/api'
import { memberSinceLabel, prettyEnum } from '../../src/lib/format'
import { colors, fonts, radius, spacing } from '../../src/theme'
import type { PublicProfile } from '../../src/types'

const GRID_GAP = spacing.md
// Two cards per row inside a SectionCard (16px page margin + 16px card padding
// on each side), so the width has to come out of the real available space rather
// than a fixed constant — 190px twice does not fit a 360dp phone.
const CARD_WIDTH =
  (Dimensions.get('window').width - spacing.lg * 2 - spacing.lg * 2 - GRID_GAP) / 2

/**
 * Public seller / agent profile — what "View Profile" on a listing opens.
 *
 * The endpoint returns no phone and no email by design; a buyer reaches the owner
 * through the listing's Call / WhatsApp CTAs, not from here. Nothing on this screen
 * should ever render a contact detail, because the payload has none to render.
 */
export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        const { data } = await userApi.getPublicProfile(id)
        if (mounted) setProfile(data)
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Could not load this profile')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const since = memberSinceLabel(profile?.memberSince)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ListSkeleton count={3} />
      ) : error || !profile ? (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={38} color={colors.mutedLight} />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}>
          <SectionCard>
            <View style={styles.identity}>
              {profile.profilePhotoUrl ? (
                <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={2}>{profile.name}</Text>
              <Text style={styles.role}>{prettyEnum(profile.role)}</Text>
            </View>

            <View style={styles.stats}>
              <Stat value={`${profile.activeListingCount}`} label={profile.activeListingCount === 1 ? 'Listing' : 'Listings'} />
              {since ? <Stat value={since} label="Member since" /> : null}
              <Stat
                value={profile.isEmailVerified ? 'Verified' : 'Unverified'}
                label="Email"
              />
            </View>

            {/* "Email verified", never "Verified Owner" — User.verified is set by
                the OTP flow, so it confirms the address, not the person. */}
            {profile.isEmailVerified ? (
              <View style={styles.note}>
                <Ionicons name="information-circle-outline" size={13} color={colors.muted} />
                <Text style={styles.noteText}>
                  Email verified means this account confirmed its address — PropFind has not
                  verified their identity.
                </Text>
              </View>
            ) : null}
          </SectionCard>

          <SectionCard title={`Active listings (${profile.activeListingCount})`}>
            {profile.listings.length ? (
              <View style={styles.grid}>
                {profile.listings.map((item) => (
                  <PropertyMiniCard
                    key={item.id}
                    item={item}
                    width={CARD_WIDTH}
                    onPress={() => router.push(`/properties/${item.id}`)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>No active listings right now.</Text>
            )}
            {profile.activeListingCount > profile.listings.length ? (
              <Text style={styles.more}>
                Showing {profile.listings.length} of {profile.activeListingCount}.
              </Text>
            ) : null}
          </SectionCard>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: colors.ink },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  errorText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },

  identity: { alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: radius.pill },
  avatarFallback: { backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, color: colors.brand },
  name: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28, color: colors.ink, marginTop: spacing.md, textAlign: 'center' },
  role: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },

  stats: {
    flexDirection: 'row', marginTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.brand },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.muted, marginTop: 2 },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: spacing.lg },
  noteText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.muted, flex: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  empty: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  more: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.muted, marginTop: spacing.md },
})
