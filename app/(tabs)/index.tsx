import { useCallback, useEffect, useState } from 'react'
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../../src/components/Text'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { HeroCarousel } from '../../src/components/HeroCarousel'
import { ListSkeleton } from '../../src/components/Skeleton'
import { CityPickerSheet } from '../../src/components/CityPickerSheet'
import { NotificationsSheet } from '../../src/components/NotificationsSheet'
import { FilterSheet, activeFilterCount, type SearchFilters } from '../../src/components/FilterSheet'
import { propertyApi, favoritesApi } from '../../src/lib/api'
import { appAlert } from '../../src/components/AppAlert'
import { useAuthStore } from '../../src/store/authStore'
import { useLocationStore } from '../../src/store/locationStore'
import { colors, fonts, radius, shadow, typography } from '../../src/theme'
import type { ListingType, PriceUnit, PropertyCard } from '../../src/types'

// One large featured card per carousel page — full content width.
const FEATURED_W = Dimensions.get('window').width - 32

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const city = useLocationStore((s) => s.city)

  const [propertyIdQuery, setPropertyIdQuery] = useState('')
  const [cityPickerOpen, setCityPickerOpen] = useState(false)
  const [recent, setRecent] = useState<PropertyCard[]>([])
  const [heroImages, setHeroImages] = useState<string[]>([])
  const [totalListings, setTotalListings] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await propertyApi.search({ citySlug: city.slug, page: 0, size: 6 })
        setRecent(data.content)
        setTotalListings(data.totalElements)
        // Seed the hero from recent photos immediately so it never starts empty.
        setHeroImages((prev) => prev.length ? prev : photosOf(data.content))
      } catch { /* swallow — home still renders */ }
      finally { setLoading(false) }
    })()
  }, [city.slug])

  // Featured photos for the hero carousel (falls back to recent, then gradient).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await propertyApi.getFeatured()
        const photos = photosOf(data)
        if (photos.length) setHeroImages(photos)
      } catch { /* hero falls back to recent/gradient */ }
    })()
  }, [])

  const goBrowse = (type: ListingType) => router.push({ pathname: '/search', params: { listingType: type } })
  const goSearch = () => {
    const q = propertyIdQuery.trim()
    router.push(q ? { pathname: '/search', params: { q } } : '/search')
  }
  const goPost = () => router.push(isLoggedIn ? '/post' : '/auth/login')

  // Filters live on the Search screen; home's filter button just collects them
  // and hands them over as route params (no duplicate result list here).
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const filterCount = activeFilterCount(filters)
  const applyFilters = (f: SearchFilters) => {
    setFilters(f)
    const q = propertyIdQuery.trim()
    router.push({
      pathname: '/search',
      params: {
        ...(q && { q }),
        ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
      },
    })
  }

  // Commercial covers both office and shop — sent as a repeated propertyTypes param.
  const goCommercial = () => router.push({ pathname: '/search', params: { propertyTypes: ['COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP'] } })
  const goPlots      = () => router.push({ pathname: '/search', params: { propertyType: 'PLOT' } })

  // Bell opens a client-derived feed (NotificationsSheet). ponytail: unread dot
  // stays off — no server-side read tracking yet; wire when push notifications land.
  const [notifOpen, setNotifOpen] = useState(false)
  const hasNotification = false

  // Featured-card hearts — one saved-ids set, refreshed on focus (Saved tab can
  // change it), optimistic toggle with revert on failure.
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  useFocusEffect(useCallback(() => {
    if (!isLoggedIn) { setSavedIds(new Set()); return }
    let mounted = true
    ;(async () => {
      try {
        const { data } = await favoritesApi.listMine(0, 50)
        if (mounted) setSavedIds(new Set(data.content.map((p) => p.id)))
      } catch { /* hearts just start unfilled */ }
    })()
    return () => { mounted = false }
  }, [isLoggedIn]))

  const toggleSave = useCallback(async (id: string) => {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    const wasSaved = savedIds.has(id)
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(id); else next.add(id)
      return next
    })
    try {
      if (wasSaved) await favoritesApi.remove(id)
      else await favoritesApi.add(id)
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(id); else next.delete(id)
        return next
      })
      appAlert('Could not update', 'Please try again.')
    }
  }, [isLoggedIn, savedIds, router])

  // Budget chips → search screen with min/max price params (already parsed there).
  const goBudget = (min?: number, max?: number) => router.push({
    pathname: '/search',
    params: { ...(min ? { minPrice: String(min) } : {}), ...(max ? { maxPrice: String(max) } : {}) },
  })

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 44 }} showsVerticalScrollIndicator={false}>
        {/* Photo-led hero; the photo runs up behind the fixed header above.
            Headline, trust badges and CTA sit directly on the photo. */}
        <View style={styles.heroWrap}>
          <HeroCarousel images={heroImages} />
          {/* Top scrim — the header floats transparently on the photo, this keeps
              the location/bell legible over a bright shot. */}
          <LinearGradient
            colors={['rgba(15,51,47,0.85)', 'transparent']}
            style={styles.heroTopScrim}
            pointerEvents="none"
          />
          <View style={styles.heroOverlay} pointerEvents="box-none">
            <LinearGradient
              colors={['transparent', 'rgba(15,51,47,0.92)']}
              style={styles.heroOverlayScrim}
              pointerEvents="none"
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroHeadline}>
                Find Your{'\n'}<Text style={styles.heroHeadlineAccent}>Dream</Text> Property
              </Text>
              <Text style={styles.trustLine}>Verified Listings  •  Direct Owners</Text>
            </View>
          </View>
        </View>

        {/* Search + quick actions + stats sit on the ivory band */}
        <View style={styles.quickStatsBand}>
          {/* Search — white pill overlapping up under the hero */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={21} color={colors.brand} />
            <TextInput
              value={propertyIdQuery}
              onChangeText={setPropertyIdQuery}
              onSubmitEditing={goSearch}
              returnKeyType="search"
              placeholder="Search locality, project or property"
              placeholderTextColor={colors.mutedLight}
              style={styles.searchInput}
              numberOfLines={1}
            />
            <Pressable onPress={() => setFilterOpen(true)} style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.85 }]} hitSlop={6}>
              <Ionicons name="options-outline" size={20} color="#fff" />
              {filterCount > 0 ? (
                <View style={styles.filterCount}><Text style={styles.filterCountText}>{filterCount}</Text></View>
              ) : null}
            </Pressable>
          </View>
          {/* Quick actions — sage card with vertical dividers between each */}
          <View style={styles.quickCard}>
            <QuickAction icon="home-outline"     label="Buy"  onPress={() => goBrowse('SALE')} />
            <View style={styles.quickDivider} />
            <QuickAction icon="key-outline"      label="Rent" onPress={() => goBrowse('RENT')} />
            <View style={styles.quickDivider} />
            <QuickAction icon="business-outline" label="Commercial" onPress={goCommercial} />
            <View style={styles.quickDivider} />
            <QuickAction icon="leaf-outline"     label="Plots" onPress={goPlots} />
          </View>

          {/* Trust / stats card */}
          <View style={styles.statsCard}>
            <Stat icon="business"         value={totalListings != null ? `${totalListings}+` : '—'} label="Listings" />
            <View style={styles.statDivider} />
            <Stat icon="shield-checkmark" value="100%"      label="Verified" />
            <View style={styles.statDivider} />
            <Stat icon="location"         value={city.name} label="& expanding" />
          </View>
        </View>

        {/* Featured Properties */}
        <Section title="Featured Property" icon="star" bleed action={{ label: 'View All', onPress: () => router.push('/search') }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={FEATURED_W + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 12, alignItems: 'flex-start' }}
          >
            {(recent.length ? recent : [undefined, undefined, undefined]).slice(0, 6).map((p, i) => (
              <FeaturedCollectionCard
                key={p?.id ?? i}
                property={p}
                saved={p ? savedIds.has(p.id) : false}
                onToggleSave={toggleSave}
                onPress={() => p ? router.push(`/properties/${p.id}`) : goBrowse('SALE')}
              />
            ))}
          </ScrollView>
        </Section>

        {/* Customize Budget */}
        <Section title="Customize Budget" background={colors.bg}>
          <View style={styles.budgetRow}>
            <BudgetChip label="Under 10L" onPress={() => goBudget(undefined, 1000000)} />
            <BudgetChip label="10L – 20L" onPress={() => goBudget(1000000, 2000000)} />
            <BudgetChip label="20L – 50L" onPress={() => goBudget(2000000, 5000000)} />
          </View>
        </Section>

        {/* Post Property CTA */}
        <View style={styles.ctaCard}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.ctaTitle}>Post Your Property in Minutes!</Text>
            <Text style={styles.ctaBody}>Reach thousands of buyers and renters effortlessly.</Text>
            <Pressable onPress={goPost} style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Post Now</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.accent} />
            </Pressable>
          </View>
          <Ionicons name="business" size={72} color="rgba(255,255,255,0.35)" />
        </View>

        {/* Recent listings */}
        {loading ? (
          <ListSkeleton count={3} />
        ) : recent.length > 0 ? (
          <Section title={`Recent in ${city.name}`} background={colors.white}>
            {recent.map((p) => (
              <RecentRow key={p.id} item={p} onPress={() => router.push(`/properties/${p.id}`)} />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      {/* Fixed header — transparent, blended into the hero photo behind it
          (the hero's own top scrim provides the contrast). */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBarInner}>
            <Pressable style={styles.locationPill} onPress={() => setCityPickerOpen(true)}>
              <Ionicons name="location" size={17} color="#fff" />
              <Text style={styles.locationCity}>{city.name}</Text>
              <Ionicons name="chevron-down" size={17} color="#fff" />
            </Pressable>
            <Pressable style={styles.bellBtn} onPress={() => setNotifOpen(true)} hitSlop={6}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {hasNotification && <View style={styles.bellDot} />}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <CityPickerSheet visible={cityPickerOpen} onClose={() => setCityPickerOpen(false)} />
      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={applyFilters} />
      <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </View>
  )
}

// ─── helpers ────────────────────────────────────────────────────

function propertyTypeLabel(t: PropertyCard['propertyType']): string {
  return t.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')
}

// Pull non-empty primary-image URLs off a list of cards.
function photosOf(cards: PropertyCard[]): string[] {
  return cards.map((c) => c.primaryImageUrl).filter((u): u is string => !!u)
}

// ─── components ─────────────────────────────────────────────────

function QuickAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7 }]}>
      <View style={styles.quickCircle}>
        <Ionicons name={icon} size={25} color={colors.brand} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  )
}

function Stat({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function Section({ title, subtitle, icon, background = colors.white, bleed = false, action, children }: { title: string; subtitle?: string; icon?: React.ComponentProps<typeof Ionicons>['name']; background?: string; bleed?: boolean; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  const headerPad = bleed ? { paddingHorizontal: 16 } : null
  return (
    <View style={[styles.section, bleed && { paddingHorizontal: 0 }, { backgroundColor: background }]}>
      <View style={[styles.sectionHeaderRow, headerPad]}>
        <View style={styles.sectionTitleRow}>
          {icon ? <Ionicons name={icon} size={20} color={colors.accent} /> : null}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8} style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.7 }]}>
            <Text style={styles.sectionActionText}>{action.label}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
      {/* Icon-led headers (Featured) carry the gold accent in the icon already. */}
      {icon ? null : <View style={[styles.sectionAccentBar, bleed && { marginLeft: 16 }]} />}
      {subtitle ? <Text style={[styles.sectionSub, headerPad]}>{subtitle}</Text> : null}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  )
}

function FeaturedCollectionCard({ property, saved, onToggleSave, onPress }: { property?: PropertyCard; saved: boolean; onToggleSave: (id: string) => void; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.featured, pressed && { opacity: 0.9 }]}>
      {property?.primaryImageUrl ? (
        <Image source={{ uri: property.primaryImageUrl }} style={styles.featuredImg} resizeMode="cover" />
      ) : (
        <View style={[styles.featuredImg, styles.noImage, { backgroundColor: colors.brandTint }]}>
          <Ionicons name="image-outline" size={36} color={colors.mutedLight} />
        </View>
      )}
      {property ? (
        <>
          {/* Featured badge, top-left. Verification is a separate fact and is stated
              once, by the pill below — never inferred from "not featured". */}
          {property.isFeatured ? (
            <View style={[styles.featuredBadge, styles.featuredBadgePremium]}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          ) : null}
          {/* Heart, top-right — frosted circle per the Green Growth mock */}
          <Pressable
            onPress={() => onToggleSave(property.id)}
            hitSlop={8}
            style={({ pressed }) => [styles.featuredHeart, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.accent : '#fff'} />
          </Pressable>

          {/* White info panel under the photo */}
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredTitle} numberOfLines={1}>{property.title}</Text>
            <View style={styles.featuredLocRow}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={styles.featuredLoc} numberOfLines={1}>{property.localityName}, {property.cityName}</Text>
            </View>
            <View style={styles.featuredMetaRow}>
              <Text style={styles.featuredPrice}>{formatPrice(property.price, property.priceUnit)}</Text>
              <View style={styles.featuredSpecs}>
                {property.bedrooms ? <FeaturedSpec icon="bed-outline" label={`${property.bedrooms} BHK`} /> : null}
                {property.bedrooms ? <View style={styles.featuredSpecDivider} /> : null}
                <FeaturedSpec icon="scan-outline" label={`${property.areaSqft} sq.ft`} />
                <View style={styles.featuredSpecDivider} />
                <FeaturedSpec icon="business-outline" label={propertyTypeLabel(property.propertyType)} />
              </View>
            </View>
            {property.isVerified ? (
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.brand} />
                <Text style={styles.verifiedPillText}>Verified Property</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </Pressable>
  )
}

function FeaturedSpec({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.featuredSpec}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <Text style={styles.featuredSpecLabel}>{label}</Text>
    </View>
  )
}

function BudgetChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.budget, pressed && { opacity: 0.85 }]}>
      <View style={styles.budgetIcon}><Ionicons name="wallet" size={18} color={colors.brand} /></View>
      <Text style={styles.budgetLabel}>{label}</Text>
    </Pressable>
  )
}

function RecentRow({ item, onPress }: { item: PropertyCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.recent, pressed && { opacity: 0.85 }]}>
      {item.primaryImageUrl ? (
        <Image source={{ uri: item.primaryImageUrl }} style={styles.recentImg} resizeMode="cover" />
      ) : (
        <View style={[styles.recentImg, styles.noImage]}><Ionicons name="image-outline" size={24} color={colors.mutedLight} /></View>
      )}
      <View style={styles.recentBody}>
        <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.recentLoc} numberOfLines={1}>{item.localityName}, {item.cityName}</Text>
        <View style={styles.recentMetaRow}>
          <Text style={styles.recentPrice}>{formatPrice(item.price, item.priceUnit)}</Text>
          <Text style={styles.recentMeta}>{item.areaSqft} sqft</Text>
        </View>
      </View>
    </Pressable>
  )
}

function formatPrice(price: number, unit: PriceUnit): string {
  if (unit === 'PER_MONTH') return `₹${price.toLocaleString('en-IN')}/mo`
  if (unit === 'PER_SQFT')  return `₹${price.toLocaleString('en-IN')}/sqft`
  if (price >= 10_000_000)  return `₹${(price / 10_000_000).toFixed(2)} Cr`
  if (price >= 100_000)     return `₹${(price / 100_000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

const styles = StyleSheet.create({
  // Fixed top bar — absolute overlay above the hero photo, rounded bottom
  header:            { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'transparent' },
  topBarInner:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  locationPill:      { flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationCity:      { color: '#fff', fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  bellBtn:           { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, position: 'absolute', top: 7, right: 7, borderWidth: 1.5, borderColor: colors.brand },

  // Hero content sits directly on the photo (bottom-anchored over a forest scrim)
  heroWrap:          { position: 'relative' },
  heroTopScrim:      { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  heroOverlay:       { position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  heroOverlayScrim:  { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },
  heroContent:       { paddingHorizontal: 22, paddingBottom: 34 },
  heroHeadline:      { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, color: colors.white },
  heroHeadlineAccent:{ color: colors.accent },
  trustLine:         { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 10 },

  // Search — ivory pill with a forest border (per the mock) + a soft lift
  searchBar:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, paddingLeft: 16, paddingRight: 8, paddingVertical: 8, marginHorizontal: 16, marginTop: 18, ...shadow.card },
  filterBtn:         { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  filterCount:       { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  filterCountText:   { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: colors.brand },
  searchInput:       { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink, padding: 0, textAlignVertical: 'center' },

  // Light-grey band behind the quick-actions + stats card
  quickStatsBand:    { backgroundColor: '#F7F3ED' },

  // Quick actions — sage card, small circles, faint vertical dividers between
  quickCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F3ED', marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: radius.lg, paddingVertical: 18, borderWidth: 1, borderColor: '#e2e7da', ...shadow.card },
  quickDivider:      { width: 1, height: 56, backgroundColor: '#dce2d3' },
  quickAction:       { flex: 1, alignItems: 'center', gap: 9 },
  quickCircle:       { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#cfd9c3' },
  quickLabel:        { fontFamily: fonts.semibold, fontSize: 12, color: colors.brand },

  // Trust / stats card
  statsCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 16, marginTop: 20, marginBottom: 18, borderRadius: radius.lg, paddingVertical: 18, borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  stat:              { flex: 1, alignItems: 'center', gap: 5 },
  statValue:         { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  statLabel:         { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  statDivider:       { width: 1, height: 40, backgroundColor: colors.borderLight },

  // Section
  section:           { paddingHorizontal: 16, paddingVertical: 24 },
  sectionHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionAccentBar:  { width: 32, height: 3, borderRadius: 2, backgroundColor: colors.accent, marginTop: 8 },
  sectionTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle:      { ...typography.h2 },
  sectionAction:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  sectionSub:        { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6 },

  // Featured — one large card per page: photo on top, white info panel below
  featured:          { width: FEATURED_W, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.white, ...shadow.card },
  featuredImg:       { width: '100%', height: 210 },
  featuredBadge:        { position: 'absolute', top: 12, left: 12, backgroundColor: colors.brand, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  featuredBadgePremium: { backgroundColor: colors.brand },
  featuredBadgeText:    { fontFamily: fonts.semibold, fontSize: 12, color: '#fff', lineHeight: 15 },
  featuredHeart:        { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.32)' },
  featuredInfo:      { padding: 16, gap: 6 },
  featuredPrice:     { fontFamily: fonts.extra, fontSize: 18, color: colors.brand, flexShrink: 1 },
  featuredTitle:     { fontFamily: fonts.extra, fontSize: 18, color: colors.ink },
  featuredLocRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredLoc:       { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, flexShrink: 1 },
  featuredMetaRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  featuredSpecs:     { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featuredSpec:      { alignItems: 'center', gap: 3 },
  featuredSpecLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  featuredSpecDivider:{ width: 1, height: 26, backgroundColor: colors.borderLight },
  verifiedPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.brandTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, marginTop: 6 },
  verifiedPillText:  { fontFamily: fonts.semibold, fontSize: 12, color: colors.brand },

  // Budget — white card + sage icon circle
  budgetRow:         { flexDirection: 'row', gap: 12 },
  budget:            { flex: 1, alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 16, borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  budgetIcon:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center' },
  budgetLabel:       { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },

  // CTA
  ctaCard:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand, marginHorizontal: 16, marginVertical: 14, borderRadius: radius.xl, padding: 22, overflow: 'hidden', ...shadow.cta },
  ctaTitle:          { color: '#fff', fontFamily: fonts.extra, fontSize: 19 },
  ctaBody:           { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.regular, fontSize: 13, marginTop: 7, lineHeight: 18 },
  ctaBtn:            { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.pill, marginTop: 14 },
  ctaBtnText:        { color: colors.brand, fontFamily: fonts.bold, fontSize: 14 },

  // Recent listings
  center:            { padding: 40, alignItems: 'center' },
  recent:            { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', ...shadow.card },
  recentImg:         { width: 108, height: 108, backgroundColor: colors.border },
  noImage:           { alignItems: 'center', justifyContent: 'center' },
  recentBody:        { flex: 1, padding: 14, justifyContent: 'space-between' },
  recentTitle:       { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  recentLoc:         { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  recentMetaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  recentPrice:       { fontFamily: fonts.extra, fontSize: 16, color: colors.brand },
  recentMeta:        { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
})
