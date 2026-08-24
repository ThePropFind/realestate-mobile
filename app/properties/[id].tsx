import { useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '../../src/components/Text'
import { DetailSkeleton } from '../../src/components/Skeleton'
import { appAlert } from '../../src/components/AppAlert'
import { ConfirmSheet } from '../../src/components/ConfirmSheet'
import { BookSiteVisitSheet } from '../../src/components/property/BookSiteVisitSheet'
import { SectionCard } from '../../src/components/property/SectionCard'
import { Gallery, SHEET_OVERLAP } from '../../src/components/property/Gallery'
import { FloatingHeader } from '../../src/components/property/FloatingHeader'
import { HeroBlock } from '../../src/components/property/HeroBlock'
import { KeySpecStrip } from '../../src/components/property/KeySpecStrip'
import { ReadMore } from '../../src/components/property/ReadMore'
import { AmenityGrid } from '../../src/components/property/AmenityGrid'
import { VideoSection } from '../../src/components/property/VideoSection'
import { LocationSection } from '../../src/components/property/LocationSection'
import { OwnerCard } from '../../src/components/property/OwnerCard'
import { PropertyDetailsGrid } from '../../src/components/property/PropertyDetailsGrid'
import { DocumentsSection } from '../../src/components/property/DocumentsSection'
import { SafetySection } from '../../src/components/property/SafetySection'
import { ReportListingSheet } from '../../src/components/property/ReportListingSheet'
import { SimilarRail } from '../../src/components/property/SimilarRail'
import { StickyActionBar } from '../../src/components/property/StickyActionBar'

import { favoritesApi, propertyApi } from '../../src/lib/api'
import { formatPrice } from '../../src/lib/format'
import { useAuthStore } from '../../src/store/authStore'
import { colors, fonts, radius, spacing, typography } from '../../src/theme'
import type { PropertyCard, PropertyDetail } from '../../src/types'

const WEB_URL =
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl
  ?? 'https://realestate-frontend-seven-topaz.vercel.app'

/**
 * Property detail — composition and data only. Every section lives in
 * src/components/property/ and renders from typed props.
 *
 * Carried forward from the screen this replaced, and easy to lose in a rewrite:
 *   #44 — the `ownerView` param routes to the owner endpoint so a DRAFT /
 *         PENDING / REJECTED listing opens from My Listings instead of 404ing
 *         on the ACTIVE-only public one.
 *   #40/#41 — BookSiteVisitSheet's contact validation and its email reset.
 *   The `mounted` flag on every fetch, the optimistic favourite with revert,
 *   and the sign-in ConfirmSheet.
 */
export default function PropertyDetailScreen() {
  const { id, ownerView } = useLocalSearchParams<{ id: string; ownerView?: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const user = useAuthStore((s) => s.user)

  const [data, setData]       = useState<PropertyDetail | null>(null)
  const [similar, setSimilar] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [liked, setLiked]     = useState(false)
  const [likeBusy, setLikeBusy]   = useState(false)
  const [visitOpen, setVisitOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  // Measured, not guessed: the sticky bar's height is 12 + a 44pt button +
  // max(insets.bottom, 12), so the old constant 96 overshot by ~40pt on a
  // gesture-nav phone and left a visible dead band under the last card.
  // Seeded with the same formula so the very first frame is already close.
  const [barH, setBarH] = useState(56 + insets.bottom)
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        // ownerView (from My Listings) uses the owner endpoint so DRAFT/PENDING/
        // REJECTED listings open instead of 404ing on the ACTIVE-only public one (#44).
        const { data } = ownerView
          ? await propertyApi.getByIdForOwner(id)
          : await propertyApi.getById(id)
        if (mounted) setData(data)
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, ownerView])

  // Similar listings are a second, non-blocking request: the rail sits at the
  // bottom of the scroll and must never hold up the price and specs above it.
  // The endpoint is ACTIVE-only, so it is skipped in owner view.
  useEffect(() => {
    if (!id || ownerView) { setSimilar([]); return }
    let mounted = true
    ;(async () => {
      try {
        const { data } = await propertyApi.getSimilar(id)
        if (mounted) setSimilar(data)
      } catch { /* the rail simply does not render */ }
    })()
    return () => { mounted = false }
  }, [id, ownerView])

  // Sync the heart with the server's saved state once we know who is logged in.
  useEffect(() => {
    if (!id || !isLoggedIn) { setLiked(false); return }
    let mounted = true
    ;(async () => {
      try {
        const { data } = await favoritesApi.check(id)
        if (mounted) setLiked(data.saved)
      } catch { /* leave unliked on failure */ }
    })()
    return () => { mounted = false }
  }, [id, isLoggedIn])

  const toggleLike = async () => {
    if (!isLoggedIn) { setSignInPromptOpen(true); return }
    if (!id || likeBusy) return
    const next = !liked
    setLiked(next)          // optimistic
    setLikeBusy(true)
    try {
      if (next) await favoritesApi.add(id)
      else await favoritesApi.remove(id)
    } catch (e: unknown) {
      setLiked(!next)       // revert
      appAlert('Could not update', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setLikeBusy(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailSkeleton />
      </SafeAreaView>
    )
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.mutedLight} />
          <Text style={styles.errorText}>{error || 'Property not found'}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const listing = data
  const phoneDigits = (listing.owner.phone || '').replace(/\D/g, '')
  const fullPhone = phoneDigits ? (phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits) : ''
  const documents = listing.documents ?? []

  const callOwner = () => {
    if (!fullPhone) return appAlert('No phone number', 'The owner has not shared a phone number.')
    Linking.openURL(`tel:+${fullPhone}`).catch(() => appAlert('Could not open dialer'))
  }

  const whatsappOwner = () => {
    if (!fullPhone) return appAlert('No phone number', 'The owner has not shared a phone number.')
    const text = encodeURIComponent(`Hi, I'm interested in your listing "${listing.title}" on PropFind.`)
    Linking.openURL(`https://wa.me/${fullPhone}?text=${text}`).catch(() => appAlert('WhatsApp not installed'))
  }

  const shareListing = async () => {
    const url = `${WEB_URL}/properties/${listing.id}`
    const ref = listing.referenceCode ? `\nProperty ID: ${listing.referenceCode}` : ''
    try {
      await Share.share({
        message:
          `${listing.title}\n${formatPrice(listing.price, listing.priceUnit)} · `
          + `${listing.localityName}, ${listing.cityName}${ref}\n\n${url}`,
        url,
      })
    } catch { /* the user dismissed the share sheet */ }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: barH + spacing.lg }}>
        {/* ① Gallery */}
        <Gallery images={listing.images ?? []} />

        {/* Everything below the gallery is ONE white sheet with rounded top
            corners, riding up over the photo — not a stack of floating cards. */}
        <View style={styles.sheet}>
          {/* ② Badges · title · location · price — title-less card, so HeroBlock
              itself carries no padding (SectionCard already supplies 16dp). */}
          <SectionCard flush>
            <HeroBlock data={listing} />
          </SectionCard>

          {/* ③ Key specifications */}
          <SectionCard flush title="Key Specifications">
            <KeySpecStrip data={listing} />
          </SectionCard>

          {/* ④ About */}
          {listing.description ? (
            <SectionCard flush title="About This Property">
              <ReadMore text={listing.description} />
            </SectionCard>
          ) : null}

          {/* ④b Walkthrough video — above amenities: it is the closest thing to a
              visit, so it belongs high, right after the description. */}
          {listing.videoUrl ? (
            <SectionCard flush title="Property Walkthrough">
              <VideoSection url={listing.videoUrl} />
            </SectionCard>
          ) : null}

          {/* ⑤ Amenities — parking is hidden here because the spec strip shows it */}
          {listing.amenities.length ? (
            <SectionCard flush title="Amenities">
              <AmenityGrid amenities={listing.amenities} hideParking />
            </SectionCard>
          ) : null}

          {/* ⑥ Location & nearby */}
          <SectionCard flush title="Location & Nearby Places">
            <LocationSection data={listing} />
          </SectionCard>

          {/* ⑦ Owner / agent */}
          <SectionCard flush title="Listed By">
            <OwnerCard
              owner={listing.owner}
              onViewProfile={() => router.push(`/users/${listing.owner.id}`)}
            />
          </SectionCard>

          {/* ⑧ Property details */}
          <SectionCard flush title="Property Details">
            <PropertyDetailsGrid data={listing} />
          </SectionCard>

          {/* ⑨ Documents & approvals — type and label only, never a link */}
          {documents.length ? (
            <SectionCard flush title="Documents & Approvals">
              <DocumentsSection documents={documents} isVerified={listing.isVerified} />
            </SectionCard>
          ) : null}

          {/* ⑩ Safety & reporting */}
          <SectionCard flush title="Safety & Reporting">
            <SafetySection onReport={() => setReportOpen(true)} />
          </SectionCard>

          {/* ⑪ Similar properties */}
          {similar.length ? (
            <SectionCard
              flush
              title="Similar Properties"
              action={
                <Pressable
                  hitSlop={6}
                  // Same pattern as the home quick-action chips. The Search screen
                  // takes its city from the location store, so only the type is passed —
                  // PropertyDetail carries localitySlug, not the localityId the filter wants.
                  onPress={() => router.push({
                    pathname: '/search',
                    params: { propertyType: listing.propertyType },
                  })}
                >
                  <View style={styles.linkRow}>
                    <Text style={styles.link}>View All</Text>
                    <Ionicons name="arrow-forward" size={13} color={colors.brand} />
                  </View>
                </Pressable>
              }
            >
              <SimilarRail
                items={similar}
                onPressItem={(nextId) => router.push(`/properties/${nextId}`)}
              />
            </SectionCard>
          ) : null}
        </View>
      </ScrollView>

      <FloatingHeader
        top={insets.top}
        liked={liked}
        onBack={() => router.back()}
        onShare={shareListing}
        onToggleLike={toggleLike}
      />

      <StickyActionBar
        bottomInset={insets.bottom}
        onHeight={setBarH}
        onCall={callOwner}
        onWhatsApp={whatsappOwner}
        onBookVisit={() => setVisitOpen(true)}
      />

      <BookSiteVisitSheet
        visible={visitOpen}
        onClose={() => setVisitOpen(false)}
        propertyId={id ?? ''}
        title={listing.title}
        isLoggedIn={isLoggedIn}
        userName={user?.name ?? ''}
        userPhone={user?.phone ?? ''}
      />

      <ReportListingSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        propertyId={id ?? ''}
      />

      <ConfirmSheet
        visible={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
        icon="heart-outline"
        title="Sign in to save"
        body="Create an account or sign in to save properties."
        confirmLabel="Sign in"
        cancelLabel="Not now"
        onConfirm={() => router.push('/auth/login')}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // White, not ivory: the sections form one continuous sheet, so there is no
  // page background peeking between them.
  safe:   { flex: 1, backgroundColor: colors.white },
  // The sheet. overflow:'hidden' is what actually makes the radius bite — without
  // it the first section's background paints square over the rounded corners.
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -SHEET_OVERLAP,
    overflow: 'hidden',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  errorText: { ...typography.body, textAlign: 'center' },
  backBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.sm, backgroundColor: colors.brand,
  },
  backBtnText: { ...typography.button },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  link: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.brand },
})
