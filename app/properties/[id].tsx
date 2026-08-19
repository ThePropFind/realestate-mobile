import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Text, TextInput } from '../../src/components/Text'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { propertyApi, favoritesApi, bookingsApi } from '../../src/lib/api'
import { DetailSkeleton } from '../../src/components/Skeleton'
import { appAlert } from '../../src/components/AppAlert'
import { useAuthStore } from '../../src/store/authStore'
import { getLandmarks, landmarkIcon } from '../../src/lib/landmarks'
import { ConfirmSheet } from '../../src/components/ConfirmSheet'
import { colors, fonts, radius, shadow } from '../../src/theme'
import type { PriceUnit, PropertyDetail, PropertyType, PreferredTenant } from '../../src/types'

const TENANT_LABELS: Record<PreferredTenant, string> = {
  FAMILY: 'Family', BACHELOR_MEN: 'Bachelors (Men)', BACHELOR_WOMEN: 'Bachelors (Women)', ANYONE: 'Anyone',
}

const BRAND = colors.brand
const ACCENT = colors.accent
const screenW = Dimensions.get('window').width

// Coimbatore center — fallback when a property has no coords.
const COIMBATORE_FALLBACK = { latitude: 11.0168, longitude: 76.9558 }

// 1 cent ≈ 435.6 sqft. 1 acre = 100 cents.
const SQFT_PER_CENT = 435.6

export default function PropertyDetailScreen() {
  const { id, ownerView } = useLocalSearchParams<{ id: string; ownerView?: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const user = useAuthStore((s) => s.user)

  const [data, setData] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [visitOpen, setVisitOpen] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
  const galleryRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        // ownerView (from My Listings) uses the owner endpoint so DRAFT/PENDING/
        // REJECTED listings open instead of 404ing on the ACTIVE-only public one
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

  // Sync the heart with the server's saved state once we know who's logged in.
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
    if (!isLoggedIn) {
      setSignInPromptOpen(true)
      return
    }
    if (!id || likeBusy) return
    const next = !liked
    setLiked(next)        // optimistic
    setLikeBusy(true)
    try {
      if (next) await favoritesApi.add(id)
      else await favoritesApi.remove(id)
    } catch (e: unknown) {
      setLiked(!next)     // revert
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
          <Text style={styles.errorText}>{error || 'Property not found'}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const images = data.images?.length ? data.images : []
  const primary = images.find((i) => i.isPrimary) ?? images[0]
  const ordered = primary ? [primary, ...images.filter((i) => i.id !== primary.id)] : images
  const phoneDigits = (data.owner.phone || '').replace(/\D/g, '')
  const fullPhone = phoneDigits ? (phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits) : ''
  const hasDocs   = (data.documents?.length ?? 0) > 0
  const isApproved = data.isVerified || hasDocs || data.approvalAuthority === 'DTCP'
                     || data.approvalAuthority === 'CMDA' || data.approvalAuthority === 'TNHB'
                     || data.approvalAuthority === 'CMA'  || data.approvalAuthority === 'RERA'

  const callOwner = () => {
    if (!fullPhone) return appAlert('No phone number', 'The owner has not shared a phone number.')
    Linking.openURL(`tel:+${fullPhone}`).catch(() => appAlert('Could not open dialer'))
  }
  const whatsappOwner = () => {
    if (!fullPhone) return appAlert('No phone number', 'The owner has not shared a phone number.')
    const text = encodeURIComponent(`Hi, I'm interested in your listing "${data.title}" on PropFind.`)
    Linking.openURL(`https://wa.me/${fullPhone}?text=${text}`).catch(() => appAlert('WhatsApp not installed'))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* ── Image gallery ───────────────────────── */}
        {ordered.length > 0 ? (
          <View style={styles.galleryWrap}>
            <ScrollView
              ref={galleryRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
              onMomentumScrollEnd={(e) =>
                setActiveImg(Math.round(e.nativeEvent.contentOffset.x / screenW))
              }
            >
              {ordered.map((img) => (
                <Image key={img.id} source={{ uri: img.url }} style={styles.galleryImg} resizeMode="cover" />
              ))}
            </ScrollView>
            {ordered.length > 1 ? (
              <>
                <View style={styles.imgCount}>
                  <Ionicons name="images-outline" size={12} color="#fff" />
                  <Text style={styles.imgCountText}>{activeImg + 1}/{ordered.length}</Text>
                </View>
                {/* Slider track — active segment shows scroll position */}
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${100 / ordered.length}%`, left: `${(100 / ordered.length) * activeImg}%` },
                    ]}
                  />
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <View style={[styles.galleryImg, styles.noImage]}><Text style={styles.noImageText}>No photos</Text></View>
        )}

        {/* ── Thumbnail strip ─────────────────────── */}
        {ordered.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbStrip}
            contentContainerStyle={styles.thumbStripContent}
          >
            {ordered.map((img, i) => (
              <Pressable
                key={img.id}
                onPress={() => {
                  galleryRef.current?.scrollTo({ x: i * screenW, animated: true })
                  setActiveImg(i)
                }}
              >
                <Image
                  source={{ uri: img.url }}
                  style={[styles.thumb, i === activeImg && styles.thumbOn]}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.floatHeader}>
          <Pressable onPress={() => router.back()} style={styles.floatBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Pressable onPress={toggleLike} style={styles.floatBtn}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? ACCENT : colors.ink} />
          </Pressable>
        </View>

        {/* ── Hero: title, badges, price ──────────── */}
        <View style={styles.section}>
          <View style={styles.badgeRow}>
            {isApproved ? <ApprovedBadge /> : null}
            {data.isFeatured ? (
              <View style={[styles.badge, { backgroundColor: '#f9f3e8', borderColor: '#e5d3ac' }]}>
                <Ionicons name="star" size={11} color={ACCENT} />
                <Text style={[styles.badgeText, { color: ACCENT }]}>Featured</Text>
              </View>
            ) : null}
            {data.priceNegotiable ? (
              <View style={[styles.badge, { backgroundColor: colors.brandTint, borderColor: '#d3ddc9' }]}>
                <Text style={[styles.badgeText, { color: BRAND }]}>Negotiable</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={2}>{data.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location" size={14} color={colors.muted} />
            <Text style={styles.location}>{data.localityName}, {data.cityName}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(data.price, data.priceUnit)}</Text>
          {data.securityDeposit && data.listingType === 'RENT' ? (
            <Text style={styles.deposit}>Security deposit: ₹{data.securityDeposit.toLocaleString('en-IN')}</Text>
          ) : null}
        </View>

        {/* ── Spec strip (branched by type) ───────── */}
        <SpecStrip data={data} />

        {/* ── Property Features (branched KV) ─────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Features</Text>
          <View style={{ marginTop: 8 }}>
            <FeatureRows data={data} />
          </View>
        </View>

        {/* ── Why Invest ──────────────────────────── */}
        <WhyInvestBlock data={data} />

        {/* ── Description ─────────────────────────── */}
        {data.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this property</Text>
            <Text style={styles.descBody}>{data.description}</Text>
          </View>
        ) : null}

        {/* ── Amenities ───────────────────────────── */}
        {data.amenities.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenityWrap}>
              {data.amenities.map((a) => (
                <View key={a.id} style={styles.amenityChip}>
                  <Ionicons name="checkmark-circle" size={13} color={BRAND} />
                  <Text style={styles.amenityText}>{a.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Location preview ────────────────────── */}
        <LocationPreview data={data} />

        {/* ── Nearby landmarks ────────────────────── */}
        <NearbyLandmarks localitySlug={data.localitySlug} />

        {/* ── Advertiser profile ──────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advertiser Profile</Text>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{data.owner.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{data.owner.name}</Text>
              <Text style={styles.ownerMeta}>
                {prettyEnum(data.owner.role)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom action bar ───────────────────── */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={callOwner} style={[styles.actionBtn, styles.actionBtnOutline]}>
          <Ionicons name="call" size={16} color={BRAND} />
          <Text style={[styles.actionBtnText, { color: BRAND }]}>Call</Text>
        </Pressable>
        <Pressable onPress={whatsappOwner} style={[styles.actionBtn, styles.actionBtnWhatsApp]}>
          <Ionicons name="logo-whatsapp" size={16} color={BRAND} />
          <Text style={[styles.actionBtnText, { color: BRAND }]}>WhatsApp</Text>
        </Pressable>
        <Pressable onPress={() => setVisitOpen(true)} style={[styles.actionBtn, styles.actionBtnPrimary]}>
          <Ionicons name="calendar" size={16} color="#fff" />
          <Text style={[styles.actionBtnText, { color: '#fff' }]}>Book Visit</Text>
        </Pressable>
      </View>

      <BookSiteVisitSheet
        visible={visitOpen}
        onClose={() => setVisitOpen(false)}
        propertyId={id ?? ''}
        title={data.title}
        isLoggedIn={isLoggedIn}
        userName={user?.name ?? ''}
        userPhone={user?.phone ?? ''}
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

// ── Approved badge ──────────────────────────────────────────

function ApprovedBadge() {
  return (
    <View style={[styles.badge, { backgroundColor: colors.brandTint, borderColor: '#d3ddc9' }]}>
      <Ionicons name="shield-checkmark" size={11} color={BRAND} />
      <Text style={[styles.badgeText, { color: BRAND }]}>Approved</Text>
    </View>
  )
}

// ── Spec strip ──────────────────────────────────────────────

function SpecStrip({ data }: { data: PropertyDetail }) {
  const type = data.propertyType
  if (type === 'PLOT') {
    const cents = data.plotAreaCents ?? (data.areaSqft / SQFT_PER_CENT)
    return (
      <View style={styles.specStrip}>
        <SpecCell label="Area"        value={`${cents.toFixed(1)} cents`} />
        <SpecCell label="Dimensions"
          value={data.plotLengthFt && data.plotBreadthFt
            ? `${data.plotLengthFt}×${data.plotBreadthFt} ft`
            : '—'} />
        <SpecCell label="Approval"   value={approvalShort(data.approvalAuthority)} />
      </View>
    )
  }
  if (type === 'AGRICULTURAL_LAND') {
    const cents = data.plotAreaCents ?? (data.areaSqft / SQFT_PER_CENT)
    const acres = cents / 100
    return (
      <View style={styles.specStrip}>
        <SpecCell label="Area"   value={acres >= 1 ? `${acres.toFixed(2)} acres` : `${cents.toFixed(1)} cents`} />
        <SpecCell label="Water"  value={data.waterSource ? prettyEnum(data.waterSource) : '—'} />
        <SpecCell label="Soil"   value={data.soilType ? prettyEnum(data.soilType) : '—'} />
      </View>
    )
  }
  if (type === 'COMMERCIAL_OFFICE' || type === 'COMMERCIAL_SHOP') {
    return (
      <View style={styles.specStrip}>
        <SpecCell label="Area"       value={`${data.areaSqft} sqft`} />
        <SpecCell label="Floor"
          value={data.floorNumber != null
            ? `${data.floorNumber}${data.totalFloors != null ? ` of ${data.totalFloors}` : ''}`
            : '—'} />
        <SpecCell label="Furnishing" value={prettyEnum(data.furnishing)} />
      </View>
    )
  }
  // Default residential / PG
  return (
    <View style={styles.specStrip}>
      <SpecCell label="Config"     value={data.bedrooms != null ? `${data.bedrooms} BHK` : 'PG'} />
      <SpecCell label="Area"       value={`${data.areaSqft} sqft`} />
      <SpecCell label="Furnishing" value={prettyEnum(data.furnishing)} />
    </View>
  )
}

// ── Property Features (branched KV) ─────────────────────────

function FeatureRows({ data }: { data: PropertyDetail }) {
  const t = data.propertyType
  if (t === 'PLOT') {
    return (
      <>
        <KV label="Listing Type"        value={listingTypeLabel(data.listingType)} />
        <KV label="Type"                value="Plot / Land" />
        {data.plotLengthFt && data.plotBreadthFt
          ? <KV label="Plot Dimensions" value={`${data.plotLengthFt} × ${data.plotBreadthFt} ft`} /> : null}
        {data.plotAreaCents != null    ? <KV label="Plot Area"     value={`${data.plotAreaCents} cents`} /> : null}
        {data.roadWidthFt != null      ? <KV label="Road Width"    value={`${data.roadWidthFt} ft`} /> : null}
        {data.approvalAuthority         ? <KV label="Approval"     value={approvalShort(data.approvalAuthority)} /> : null}
        {data.boundaryWall != null     ? <KV label="Compound Wall" value={data.boundaryWall ? 'Built' : 'Not built'} /> : null}
        {data.cornerPlot != null       ? <KV label="Corner Plot"   value={data.cornerPlot ? 'Yes' : 'No'} /> : null}
        {data.ownershipType             ? <KV label="Ownership"    value={prettyEnum(data.ownershipType)} /> : null}
        {data.facing                    ? <KV label="Facing"       value={data.facing} /> : null}
        {data.addressLine               ? <KV label="Address"      value={data.addressLine} /> : null}
      </>
    )
  }
  if (t === 'AGRICULTURAL_LAND') {
    const cents = data.plotAreaCents ?? (data.areaSqft / SQFT_PER_CENT)
    return (
      <>
        <KV label="Listing Type"          value={listingTypeLabel(data.listingType)} />
        <KV label="Type"                  value="Agricultural Land" />
        <KV label="Area"                  value={`${cents.toFixed(1)} cents (${(cents / 100).toFixed(2)} acres)`} />
        {data.soilType                    ? <KV label="Soil Type"    value={prettyEnum(data.soilType)} /> : null}
        {data.waterSource                 ? <KV label="Water Source" value={prettyEnum(data.waterSource)} /> : null}
        {data.hasWell != null            ? <KV label="Open Well"    value={data.hasWell ? 'Yes' : 'No'} /> : null}
        {data.electricService             ? <KV label="Power"        value={prettyEnum(data.electricService)} /> : null}
        {data.cropCurrentlyGrown          ? <KV label="Current Crop" value={data.cropCurrentlyGrown} /> : null}
        {data.fenced != null             ? <KV label="Fenced"       value={data.fenced ? 'Yes' : 'No'} /> : null}
        {data.ownershipType               ? <KV label="Ownership"    value={prettyEnum(data.ownershipType)} /> : null}
        {data.addressLine                 ? <KV label="Address"      value={data.addressLine} /> : null}
      </>
    )
  }
  // Residential / commercial / PG
  return (
    <>
      <KV label="Listing Type"             value={listingTypeLabel(data.listingType)} />
      <KV label="Property Type"            value={prettyEnum(data.propertyType)} />
      {data.bedrooms != null              ? <KV label="Bedrooms"      value={`${data.bedrooms}`} /> : null}
      {data.bathrooms != null             ? <KV label="Bathrooms"     value={`${data.bathrooms}`} /> : null}
      {data.balconies != null             ? <KV label="Balconies"     value={`${data.balconies}`} /> : null}
      {data.floorNumber != null           ? <KV label="Floor"         value={`${data.floorNumber}${data.totalFloors != null ? ` of ${data.totalFloors}` : ''}`} /> : null}
      {data.facing                         ? <KV label="Facing"        value={data.facing} /> : null}
      {data.ageOfProperty != null         ? <KV label="Age"           value={data.ageOfProperty === 0 ? 'New' : `${data.ageOfProperty} yrs`} /> : null}
      <KV label="Parking"                  value={data.parkingAvailable ? 'Available' : 'Not available'} />
      {(data.listingType === 'RENT' || data.listingType === 'PG') && data.preferredTenant
        ? <KV label="Preferred Tenant" value={TENANT_LABELS[data.preferredTenant]} /> : null}
      {data.carpetAreaSqft != null        ? <KV label="Carpet Area"   value={`${data.carpetAreaSqft} sqft`} /> : null}
      {data.ownershipType                  ? <KV label="Ownership"     value={prettyEnum(data.ownershipType)} /> : null}
      {data.availableFrom                  ? <KV label="Available From" value={data.availableFrom} /> : null}
      {data.addressLine                    ? <KV label="Address"       value={data.addressLine} /> : null}
    </>
  )
}

// ── Why Invest ──────────────────────────────────────────────

function WhyInvestBlock({ data }: { data: PropertyDetail }) {
  const bullets = whyInvest(data.propertyType, data.listingType)
  if (!bullets.length) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {data.listingType === 'SALE' ? 'Why invest here' : 'Why this property'}
      </Text>
      <View style={{ marginTop: 10, gap: 10 }}>
        {bullets.map((b, i) => (
          <View key={i} style={styles.invRow}>
            <View style={styles.invDot}>
              <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={14} color={BRAND} />
            </View>
            <Text style={styles.invText}>{b.text}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function whyInvest(type: PropertyType, listing: 'SALE' | 'RENT' | 'PG')
  : { text: string; icon: string }[] {
  if (listing === 'PG') return [
    { text: 'Walking distance to colleges and IT campuses in Peelamedu and Hopes College.', icon: 'walk' },
    { text: 'Bills, wifi and daily housekeeping typically included — minimal setup overhead.', icon: 'cash' },
    { text: 'Flexible short-term stay with deposit refund on checkout.', icon: 'time' },
  ]
  if (listing === 'RENT') return [
    { text: 'Move-in ready — no major capital outlay needed.', icon: 'home' },
    { text: 'Easy switch if your work location or family needs change.', icon: 'swap-horizontal' },
    { text: 'Owner-listed (no broker) — lower friction on move-in.', icon: 'people' },
  ]
  // SALE
  switch (type) {
    case 'PLOT':
      return [
        { text: 'You own the land — no shared walls, no apartment HOA fees.', icon: 'shield-checkmark' },
        { text: 'DTCP-approved layouts have appreciated 8–12% per year in Coimbatore.', icon: 'trending-up' },
        { text: 'Build to your own spec, on your own timeline.', icon: 'construct' },
      ]
    case 'AGRICULTURAL_LAND':
      return [
        { text: 'Productive farm yields cash flow from day one (coconut, banana, etc.).', icon: 'leaf' },
        { text: 'Long-term hedge — agricultural land has lower correlation with stock market.', icon: 'trending-up' },
        { text: 'Re-classification to residential is possible in select pockets near city limits.', icon: 'map' },
      ]
    case 'VILLA':
    case 'INDEPENDENT_HOUSE':
      return [
        { text: 'Independent unit — no neighbours sharing walls, full privacy.', icon: 'home' },
        { text: 'Strong end-user demand from families relocating to Coimbatore.', icon: 'people' },
        { text: 'Resale market is robust for non-apartment stock in central areas.', icon: 'trending-up' },
      ]
    case 'COMMERCIAL_OFFICE':
    case 'COMMERCIAL_SHOP':
      return [
        { text: 'Rental yields of 6–8% — significantly higher than residential.', icon: 'cash' },
        { text: 'IT corridor demand keeps office vacancy under 8% across Coimbatore.', icon: 'business' },
        { text: 'Long-tenure commercial leases (3+3+3 yrs) reduce churn.', icon: 'time' },
      ]
    case 'APARTMENT':
    case 'BUILDER_FLOOR':
    case 'PG_HOSTEL':
    default:
      return [
        { text: 'Coimbatore residential prices have grown 9% YoY (CREDAI 2025).', icon: 'trending-up' },
        { text: 'Strong rental demand near work hubs like Tidel Park and Peelamedu.', icon: 'cash' },
        { text: 'Walking access to schools, hospitals and transport.', icon: 'walk' },
      ]
  }
}

// ── Location preview ────────────────────────────────────────

function LocationPreview({ data }: { data: PropertyDetail }) {
  const lat = data.latitude ?? COIMBATORE_FALLBACK.latitude
  const lng = data.longitude ?? COIMBATORE_FALLBACK.longitude
  const hasExact = data.latitude != null && data.longitude != null

  const openInMaps = () => {
    const url = Platform.select({
      ios:     `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(data.title)}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(data.title)})`,
      default: `https://www.google.com/maps?q=${lat},${lng}`,
    })!
    Linking.openURL(url).catch(() => appAlert('Could not open map'))
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Pressable onPress={openInMaps} hitSlop={6}>
          <Text style={styles.linkText}>Open in Maps</Text>
        </Pressable>
      </View>
      <View style={styles.mapWrap}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={ACCENT} />
        </MapView>
        {!hasExact ? (
          <View style={styles.mapNoticeWrap}>
            <Text style={styles.mapNotice}>Showing locality area — exact pin not set</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.muted}>{data.localityName}, {data.cityName}</Text>
    </View>
  )
}

// ── Nearby landmarks ────────────────────────────────────────

function NearbyLandmarks({ localitySlug }: { localitySlug?: string | null }) {
  const items = useMemo(() => getLandmarks(localitySlug), [localitySlug])
  if (!items.length) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Nearby landmarks</Text>
      <View style={{ marginTop: 10 }}>
        {items.map((lm, i) => (
          <View key={`${lm.name}-${i}`} style={styles.landmarkRow}>
            <View style={styles.landmarkIcon}>
              <Ionicons name={landmarkIcon(lm.kind) as keyof typeof Ionicons.glyphMap} size={15} color={BRAND} />
            </View>
            <Text style={styles.landmarkName} numberOfLines={1}>{lm.name}</Text>
            <Text style={styles.landmarkDist}>{lm.distance}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── Book Site Visit sheet ───────────────────────────────────

function BookSiteVisitSheet({
  visible, onClose, propertyId, title, isLoggedIn, userName, userPhone,
}: {
  visible: boolean; onClose: () => void; propertyId: string; title: string
  isLoggedIn: boolean; userName: string; userPhone: string
}) {
  const [date, setDate] = useState('')   // free text — full datepicker is Phase D
  const [time, setTime] = useState('')
  const [guestName, setGuestName]   = useState(userName)
  const [guestPhone, setGuestPhone] = useState(userPhone)
  const [guestEmail, setGuestEmail] = useState('')
  const [notes, setNotes]           = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (visible) {
      setGuestName(userName)
      setGuestPhone(userPhone)
    }
  }, [visible, userName, userPhone])

  const submit = async () => {
    const trimmedName = guestName.trim()
    const trimmedPhone = guestPhone.trim()
    const trimmedEmail = guestEmail.trim()
    // The booking API always requires a name plus phone OR email — logged-in users too
    // (a profile registered without a phone would otherwise submit no reachable contact).
    if (!trimmedName || (!trimmedPhone && !trimmedEmail)) {
      return appAlert('Contact details required', 'Please share your name and at least a phone or email.')
    }

    setSending(true)
    try {
      await bookingsApi.book(propertyId, {
        contactName: trimmedName,
        contactPhone: trimmedPhone || undefined,
        contactEmail: trimmedEmail || undefined,
        preferredDate: date.trim() || undefined,
        preferredWindow: time.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
      // Reset transient fields
      setDate(''); setTime(''); setNotes(''); setGuestEmail('')
      appAlert('Visit requested', 'The owner will reach out to confirm a slot. Track it in the Bookings tab.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send request'
      appAlert('Could not send', msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Book a site visit</Text>
          <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={colors.ink} /></Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalSub} numberOfLines={2}>{title}</Text>

            <Text style={styles.fieldLabel}>Preferred date</Text>
            <TextInput placeholder="e.g. Sat, 31 May" placeholderTextColor={colors.mutedLight}
              value={date} onChangeText={setDate} style={styles.input} />

            <Text style={styles.fieldLabel}>Preferred time</Text>
            <TextInput placeholder="e.g. 11:00 AM – 12:30 PM" placeholderTextColor={colors.mutedLight}
              value={time} onChangeText={setTime} style={styles.input} />

            <Text style={styles.fieldLabel}>Your name</Text>
            <TextInput placeholder="Full name" placeholderTextColor={colors.mutedLight}
              value={guestName} onChangeText={setGuestName} style={styles.input} />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput placeholder="10-digit mobile" placeholderTextColor={colors.mutedLight}
              value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" style={styles.input} />

            {!isLoggedIn ? (
              <>
                <Text style={styles.fieldLabel}>Email (optional)</Text>
                <TextInput placeholder="you@example.com" placeholderTextColor={colors.mutedLight}
                  value={guestEmail} onChangeText={setGuestEmail}
                  autoCapitalize="none" keyboardType="email-address" style={styles.input} />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput placeholder="Any specific questions for the owner?" placeholderTextColor={colors.mutedLight}
              value={notes} onChangeText={setNotes} multiline numberOfLines={4}
              style={[styles.input, styles.textArea]} />

            <Pressable onPress={submit} disabled={sending}
              style={({ pressed }) => [styles.modalSubmit, (sending || pressed) && { opacity: 0.85 }]}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Request site visit</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Tiny helpers ────────────────────────────────────────────

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specCell}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{label}</Text>
      <Text style={styles.kvVal}>{value}</Text>
    </View>
  )
}

function formatPrice(price: number, unit: PriceUnit): string {
  if (unit === 'PER_MONTH') return `₹${price.toLocaleString('en-IN')}/mo`
  if (unit === 'PER_SQFT')  return `₹${price.toLocaleString('en-IN')}/sqft`
  if (price >= 10_000_000)  return `₹${(price / 10_000_000).toFixed(2)} Cr`
  if (price >= 100_000)     return `₹${(price / 100_000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

function prettyEnum(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function listingTypeLabel(t: string): string {
  if (t === 'SALE') return 'For Sale'
  if (t === 'RENT') return 'For Rent'
  if (t === 'PG')   return 'PG / Hostel'
  return t
}

function approvalShort(a: PropertyDetail['approvalAuthority']): string {
  if (!a || a === 'NONE')  return 'Unapproved'
  if (a === 'OTHER')       return 'Other'
  if (a === 'LOCAL')       return 'Panchayat'
  return a
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.white },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText:      { color: colors.danger, fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center' },
  backBtn:        { marginTop: 14, backgroundColor: BRAND, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.sm },
  backBtnText:    { color: '#fff', fontFamily: fonts.bold },

  galleryWrap:    { position: 'relative' },
  gallery:        { width: screenW, height: 260 },
  galleryImg:     { width: screenW, height: 260, backgroundColor: colors.border },
  noImage:        { alignItems: 'center', justifyContent: 'center' },
  noImageText:    { fontFamily: fonts.regular, color: colors.muted },

  imgCount:       { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.65)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  imgCountText:   { color: '#fff', fontFamily: fonts.bold, fontSize: 11 },
  sliderTrack:    { position: 'absolute', bottom: 10, left: 16, right: 16, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  sliderFill:     { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, backgroundColor: '#fff' },

  thumbStrip:        { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  thumbStripContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  thumb:             { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.border, borderWidth: 2, borderColor: 'transparent' },
  thumbOn:           { borderColor: BRAND },

  floatHeader:    { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  floatBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow.card },

  section:        { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sectionHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  badgeRow:       { flexDirection: 'row', gap: 6, marginBottom: 8 },
  badge:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText:      { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },

  title:          { fontFamily: fonts.bold, fontSize: 19, color: colors.ink },
  locRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  location:       { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  price:          { fontFamily: fonts.extra, fontSize: 22, color: BRAND, marginTop: 10 },
  deposit:        { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 },

  specStrip:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.bg },
  specCell:       { flex: 1 },
  specLabel:      { fontFamily: fonts.semibold, fontSize: 10, color: colors.mutedLight, letterSpacing: 0.6 },
  specValue:      { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 4 },

  sectionTitle:   { fontFamily: fonts.display, fontSize: 16, lineHeight: 22, color: colors.ink },
  linkText:       { fontFamily: fonts.semibold, fontSize: 13, color: BRAND },

  descBody:       { fontFamily: fonts.regular, fontSize: 14, color: '#334155', lineHeight: 21, marginTop: 8 },

  kvRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  kvKey:          { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  kvVal:          { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, maxWidth: '60%', textAlign: 'right' },

  amenityWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  amenityChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.brandTint },
  amenityText:    { fontFamily: fonts.semibold, fontSize: 12, color: BRAND },

  invRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  invDot:         { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  invText:        { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: '#334155', lineHeight: 20 },

  mapWrap:        { height: 170, marginTop: 10, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border, position: 'relative' },
  mapNoticeWrap:  { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(15,23,42,0.78)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  mapNotice:     { color: '#fff', fontFamily: fonts.regular, fontSize: 11 },
  muted:         { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 8 },

  landmarkRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  landmarkIcon:   { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center' },
  landmarkName:   { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  landmarkDist:   { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },

  ownerRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  ownerAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  ownerAvatarText:{ color: '#fff', fontFamily: fonts.bold, fontSize: 17 },
  ownerName:      { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  ownerMeta:      { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  actionBar:      { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.sm },
  actionBtnOutline:{ borderWidth: 1, borderColor: BRAND, backgroundColor: colors.white },
  actionBtnWhatsApp:{ borderWidth: 1, borderColor: BRAND, backgroundColor: colors.brandTint },
  actionBtnPrimary:{ backgroundColor: ACCENT, flex: 1.3 },
  actionBtnText:  { fontFamily: fonts.bold, fontSize: 13 },

  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle:     { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  modalSub:       { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 16 },
  fieldLabel:     { fontFamily: fonts.semibold, fontSize: 12, color: '#475569', marginBottom: 6, marginTop: 4 },
  input:          { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 11, fontFamily: fonts.regular, fontSize: 14, color: colors.ink, marginBottom: 10 },
  textArea:       { minHeight: 90, textAlignVertical: 'top' },
  modalSubmit:    { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: radius.sm, alignItems: 'center', marginTop: 10, ...shadow.cta },
  modalSubmitText:{ color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
})
