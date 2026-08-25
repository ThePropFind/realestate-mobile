import { useEffect, useMemo, useState } from 'react'
import { FlatList, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '../../src/components/Text'
import { ListSkeleton } from '../../src/components/Skeleton'
import { InfoSheet } from '../../src/components/InfoSheet'
import { PropertyResultCard } from '../../src/components/property/PropertyResultCard'
import { userApi } from '../../src/lib/api'
import { memberSinceLabel, prettyEnum } from '../../src/lib/format'
import { visibleFacets, facetCounts, PROPERTY_FACETS } from '../../src/lib/propertyFacets'
import { colors, fonts, radius, shadow, typography } from '../../src/theme'
import type { PropertyCard, PublicProfile } from '../../src/types'

const BRAND  = colors.brand
const ACCENT = colors.accent

// Fine print that belongs to the "Verified" stat. One line stays on screen; the
// full wording lives in the sheet, so the disclaimer never eats the header.
const VERIFIED_NOTE =
  'Email verified means this account confirmed the address it signed up with. ' +
  'PropFind has not checked who they are, and does not vouch for them — treat ' +
  'every listing on its own merits.'

/**
 * Public seller / agent profile — what "View Profile" on a listing opens.
 *
 * Laid out like the Saved tab: a brand-green header carrying the identity, and
 * the listings below it at FULL page width. They used to sit inside a SectionCard,
 * which cost each card 64pt (section margin + section padding) and squeezed the
 * title, price and spec strip into the congested column the mock showed.
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
  const [facet, setFacet] = useState('all')
  const [noteOpen, setNoteOpen] = useState(false)

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

  const listings = useMemo(() => profile?.listings ?? [], [profile])
  // Chips only when they would actually split this seller's stock — a lone
  // "All" chip, or one that filters to nothing, is a control you can only regret.
  const facets  = useMemo(() => visibleFacets(listings), [listings])
  const counts  = useMemo(() => facetCounts(listings), [listings])
  const active  = facets.length ? facet : 'all'
  const visible = useMemo(() => {
    const f = PROPERTY_FACETS.find((x) => x.key === active) ?? PROPERTY_FACETS[0]
    return listings.filter(f.match)
  }, [listings, active])

  const since = memberSinceLabel(profile?.memberSince)

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.navTitle}>Profile</Text>
          <View style={styles.navBtnSpacer} />
        </View>

        {profile ? (
          <>
            <View style={styles.identity}>
              <View>
                {profile.profilePhotoUrl ? (
                  <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                {profile.isEmailVerified ? (
                  <View style={styles.avatarBadge}>
                    <Ionicons name="checkmark" size={11} color={colors.white} />
                  </View>
                ) : null}
              </View>

              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={2}>{profile.name}</Text>
                <View style={styles.rolePill}>
                  <Ionicons name="pricetag" size={10} color={ACCENT} />
                  <Text style={styles.rolePillText}>{prettyEnum(profile.role)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statBar}>
              <Stat
                value={`${profile.activeListingCount}`}
                label={profile.activeListingCount === 1 ? 'Listing' : 'Listings'}
              />
              {since ? <><Divider /><Stat value={since} label="Member since" /></> : null}
              <Divider />
              <Stat value={profile.isEmailVerified ? 'Verified' : 'Unverified'} label="Email" />
            </View>

            {/* "Email verified", never "Verified Owner" — User.verified is set by
                the OTP flow, so it confirms the address, not the person. The line
                stays visible; tapping opens the full wording. */}
            <Pressable
              onPress={() => setNoteOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="What does email verified mean?"
              style={({ pressed }) => [styles.note, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={styles.noteText} numberOfLines={1}>
                {profile.isEmailVerified
                  ? 'Email verified — not an identity check.'
                  : 'This account has not confirmed its email.'}
              </Text>
              <Text style={styles.noteLink}>Learn more</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.identity}>
            <View style={[styles.avatar, styles.avatarGhost]} />
            <View style={styles.identityText}>
              <View style={[styles.ghostLine, { width: '65%' }]} />
              <View style={[styles.ghostLine, { width: '35%', height: 12, marginTop: 8 }]} />
            </View>
          </View>
        )}
      </View>

      {/* The ivory sheet curves up over the green band — the seam the Saved tab
          gets from its chip row, which this screen has no room for up top. */}
      <View style={styles.sheet}>
        {loading ? (
          <ListSkeleton count={3} />
        ) : error || !profile ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Ionicons name="person-circle-outline" size={40} color={BRAND} />
            </View>
            <Text style={styles.emptyTitle}>{error ? 'Could not load this profile' : 'Profile not found'}</Text>
            <Text style={styles.emptySub}>
              {error ? 'Check your connection and try again.' : 'This seller may have closed their account.'}
            </Text>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
              <Text style={styles.ctaText}>Go back</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(p: PropertyCard) => p.id}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 28 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Active listings</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{profile.activeListingCount}</Text>
                  </View>
                </View>

                {facets.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroller}
                    contentContainerStyle={styles.chipsRow}
                  >
                    {facets.map((f) => {
                      const on = f.key === active
                      return (
                        <Pressable
                          key={f.key}
                          onPress={() => setFacet(f.key)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>
                            {f.label} ({counts[f.key] ?? 0})
                          </Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                ) : (
                  <View style={{ height: 14 }} />
                )}
              </>
            }
            renderItem={({ item }) => (
              /* The same card the Saved tab and the results list use — one card
                 to maintain instead of two, and at full page width it reads at a
                 glance. No heart and no Call/WhatsApp here: this screen holds
                 neither a favourites set nor a reason to re-pitch the seller you
                 are already looking at. */
              <PropertyResultCard item={item} onPress={() => router.push(`/properties/${item.id}`)} />
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="home-outline" size={36} color={BRAND} />
                </View>
                <Text style={styles.emptyTitle}>
                  {listings.length ? 'Nothing in this category' : 'No active listings right now'}
                </Text>
                <Text style={styles.emptySub}>
                  {listings.length
                    ? 'Try another category to see the rest of their listings.'
                    : 'This seller has nothing live at the moment. Check back later.'}
                </Text>
              </View>
            }
            ListFooterComponent={
              profile.activeListingCount > listings.length ? (
                <Text style={styles.more}>
                  Showing {listings.length} of {profile.activeListingCount} listings.
                </Text>
              ) : null
            }
          />
        )}
      </View>

      <InfoSheet
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
        icon="shield-checkmark-outline"
        title="What “verified” means"
        body={VERIFIED_NOTE}
      />
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

function Divider() {
  return <View style={styles.statDivider} />
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND },

  header:      { backgroundColor: BRAND, paddingHorizontal: 16, paddingBottom: 30 },
  navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:      { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  navBtnSpacer:{ width: 36 },
  navTitle:    { ...typography.navTitle, color: colors.white },

  identity:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  avatar:        { width: 68, height: 68, borderRadius: radius.pill, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  avatarFallback:{ backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  avatarGhost:   { backgroundColor: 'rgba(255,255,255,0.12)' },
  avatarText:    { fontFamily: fonts.extra, fontSize: 27, lineHeight: 34, color: colors.white },
  avatarBadge:   { position: 'absolute', right: -1, bottom: -1, width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, borderWidth: 2, borderColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  identityText:  { flex: 1, gap: 7 },
  name:          { fontFamily: fonts.bold, fontSize: 21, lineHeight: 28, color: colors.white },
  rolePill:      { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  rolePillText:  { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.white, letterSpacing: 0.2 },

  ghostLine:   { height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)' },

  statBar:     { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingVertical: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  stat:        { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statValue:   { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.white },
  statLabel:   { fontFamily: fonts.medium, fontSize: 10.5, lineHeight: 14, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.18)' },

  note:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  noteText:    { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.75)', flexShrink: 1 },
  noteLink:    { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: ACCENT },

  sheet:       { flex: 1, backgroundColor: colors.bg, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  sectionTitle:{ fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: colors.ink },
  countPill:   { minWidth: 26, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.brandTint, alignItems: 'center' },
  countPillText:{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 17, color: BRAND },

  // flexGrow/flexShrink pinned, and a paddingBottom shadow gutter — see the note
  // on the same row in saved.tsx.
  chipScroller:{ flexGrow: 0, flexShrink: 0 },
  chipsRow:    { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 9 },
  chip:        { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  chipOn:      { backgroundColor: BRAND, borderColor: BRAND },
  chipText:    { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17, color: colors.ink },
  chipTextOn:  { fontFamily: fonts.bold, color: colors.white },

  center:      { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 24, alignItems: 'center' },
  emptyIcon:   { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:  { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink, textAlign: 'center' },
  emptySub:    { ...typography.body, marginTop: 6, textAlign: 'center' },
  cta:         { marginTop: 18, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.sm, ...shadow.cta },
  ctaText:     { ...typography.button },

  more:        { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16, color: colors.muted, textAlign: 'center', marginTop: 2 },
})
