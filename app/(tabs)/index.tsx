import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../../src/components/Text'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { HeroCarousel, HERO_PHOTO_H } from '../../src/components/HeroCarousel'
import { FeaturedCardSkeleton, ListSkeleton } from '../../src/components/Skeleton'
import { CityPickerSheet } from '../../src/components/CityPickerSheet'
import { NotificationsSheet } from '../../src/components/NotificationsSheet'
import { PropertyMiniCard, MINI_CARD_WIDTH } from '../../src/components/property/PropertyMiniCard'
import { CardChip, CardLocation, CardPrice, CardSpecs, CardTitle, CARD_SCALE, listingSpecs } from '../../src/components/property/CardAtoms'
import { propertyApi, favoritesApi } from '../../src/lib/api'
import { appAlert } from '../../src/components/AppAlert'
import { formatPrice } from '../../src/lib/format'
import { useNoticeCount } from '../../src/lib/notifications'
import { useAuthStore } from '../../src/store/authStore'
import { useLocationStore } from '../../src/store/locationStore'
import { blendScrollY, useStatusBarBlend } from '../../src/lib/statusBarBlend'
import { colors, fonts, radius, shadow, typography } from '../../src/theme'
import type { ListingType, PropertyCard } from '../../src/types'

// One featured card per carousel page, laid out photo-left / facts-right so the
// whole section lands inside the first screen instead of pushing the fold. The
// card stops short of the content width on purpose — the sliver of the next card
// is what says "this scrolls".
const FEATURED_W = Dimensions.get('window').width - 48
const FEATURED_PAD = 10
const FEATURED_IMG_H = 148
const FEATURED_IMG_W = Math.round((FEATURED_W - FEATURED_PAD * 2) * 0.46)

// Home draws three different listing cards; all three speak the one card
// vocabulary in src/components/property/CardAtoms.tsx. The featured card runs at
// `md` — the same size as the recent row and the Search / Saved / profile card —
// with the spec strip and chips a step down at `sm`, because it now has half a
// card's width to say it in. The rail card stays at `sm`.
const HERO_SIZE = 'md' as const
const FEATURED_MINOR = 'sm' as const
const ROW_SIZE  = 'md' as const

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const city = useLocationStore((s) => s.city)

  // The hero photo runs edge-to-edge under the OS status bar, so the root
  // layout's brand band stays transparent over it and fades back in as the hero
  // scrolls away. `blendScrollY` is what drives that fade — native driver, so it
  // tracks the finger exactly.
  useStatusBarBlend(HERO_PHOTO_H)
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: blendScrollY } } }], { useNativeDriver: true }),
  ).current

  const [propertyIdQuery, setPropertyIdQuery] = useState('')
  const [cityPickerOpen, setCityPickerOpen] = useState(false)
  const [recent, setRecent] = useState<PropertyCard[]>([])
  const [featured, setFeatured] = useState<PropertyCard[]>([])
  const [heroImages, setHeroImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Which featured card is centred — drives the dots under the rail.
  const [featuredIndex, setFeaturedIndex] = useState(0)

  // Newest in the selected city — feeds both the Recommended rail and the
  // Recent list, so fetch enough for the rail (8) plus the list (6).
  const loadCity = useCallback(async () => {
    try {
      const { data } = await propertyApi.search({ citySlug: city.slug, page: 0, size: 10 })
      setRecent(data.content)
      // Seed the hero from recent photos immediately so it never starts empty.
      setHeroImages((prev) => prev.length ? prev : photosOf(data.content))
    } catch { /* swallow — home still renders */ }
    finally { setLoading(false) }
  }, [city.slug])

  // Genuinely featured listings — drive the Featured carousel *and* the hero
  // photos. Falls back to the city results below if nothing is flagged.
  const loadFeatured = useCallback(async () => {
    try {
      const { data } = await propertyApi.getFeatured()
      setFeatured(data)
      const photos = photosOf(data)
      if (photos.length) setHeroImages(photos)
    } catch { /* hero falls back to recent/gradient */ }
  }, [])

  useEffect(() => { void loadCity() }, [loadCity])
  useEffect(() => { void loadFeatured() }, [loadFeatured])

  // Pull-to-refresh — the rest of the app has it, and without it Android's
  // overscroll stretch is the only thing a downward drag on home produces.
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try { await Promise.all([loadCity(), loadFeatured()]) }
    finally { setRefreshing(false) }
  }, [loadCity, loadFeatured])

  const featuredCards = featured.length ? featured : recent
  const topFeatured = featuredCards.slice(0, 6)

  const goBrowse = (type: ListingType) => router.push({ pathname: '/search', params: { listingType: type } })
  const goSearch = () => {
    const q = propertyIdQuery.trim()
    router.push(q ? { pathname: '/search', params: { q } } : '/search')
  }
  // Filters live on their own modal screen; home just opens it, seeded with the
  // current keyword. It applies straight to /search — home never lists results.
  const openFilters = () => {
    const q = propertyIdQuery.trim()
    router.push({ pathname: '/filters', params: q ? { q } : {} })
  }

  // Commercial covers both office and shop — sent as a repeated propertyTypes param.
  const goCommercial = () => router.push({ pathname: '/search', params: { propertyTypes: ['COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP'] } })
  const goPlots      = () => router.push({ pathname: '/search', params: { propertyType: 'PLOT' } })

  // Bell badge — client-derived feed (bookings + listing status changes); the
  // hook returns 0 when signed out. No server-side read tracking yet, so the
  // count is "things worth looking at", not strictly unread.
  const [notifOpen, setNotifOpen] = useState(false)
  const noticeCount = useNoticeCount()

  // Card hearts — one saved-ids set, refreshed on focus (Saved tab can change
  // it), optimistic toggle with revert on failure.
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 44 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Kills Android's rubber-band stretch on the hero photo; the pull-down
        // gesture is still handled by the SwipeRefreshLayout wrapper above it.
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // The spinner lands on the dark hero photo, so it runs white on
            // brand rather than the brand-on-white used elsewhere.
            tintColor="#fff"
            colors={['#fff']}
            progressBackgroundColor={colors.brand}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* Photo-led hero. The location/bell bar is absolute *inside* this
            wrapper rather than over the screen, so it scrolls away with the
            photo instead of pinning to the top. */}
        <View style={styles.heroWrap}>
          <HeroCarousel images={heroImages} />
          {/* ONE continuous scrim over the whole hero — not a top one plus a
              bottom one, which overlapped and banded unevenly.
              Stop 0 is TRANSLUCENT, not the opaque brand it used to be: the
              status-bar band above is transparent over the hero now, so the
              photo is meant to read all the way up to the clock. 0.62 is the
              floor that keeps white glyphs and the location pill legible over a
              bright daylight listing photo. It opens up around 30-40% where the
              subject of a listing photo usually sits, then closes back down so
              the headline, CTA and the search bar below always have contrast. */}
          <LinearGradient
            colors={[
              'rgba(15,51,47,0.62)',
              'rgba(24,74,69,0.50)',
              'rgba(24,74,69,0.38)',
              'rgba(18,56,52,0.72)',
              'rgba(15,51,47,0.95)',
            ]}
            locations={[0, 0.14, 0.36, 0.64, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.header}>
            <SafeAreaView edges={['top']}>
              <View style={styles.topBarInner}>
                <Pressable style={styles.locationPill} onPress={() => setCityPickerOpen(true)}>
                  <Ionicons name="location" size={14} color="#fff" />
                  <Text style={styles.locationCity} numberOfLines={1}>{city.name}, {city.state}</Text>
                  <Ionicons name="chevron-down" size={15} color="#fff" />
                </Pressable>
                <Pressable style={styles.bellBtn} onPress={() => setNotifOpen(true)} hitSlop={6}>
                  <Ionicons name="notifications-outline" size={21} color="#fff" />
                  {noticeCount > 0 ? (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{noticeCount > 9 ? '9+' : noticeCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.heroOverlay} pointerEvents="box-none">
            <View style={styles.heroContent}>
              <Text style={styles.heroHeadline}>
                Find Your{'\n'}<Text style={styles.heroHeadlineAccent}>Dream</Text> Property
              </Text>
              {/* One line at the design size — it wraps and unbalances the hero
                  if it grows, so it shrinks to fit on narrow phones. */}
              <Text style={styles.trustLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                Verified Listings  •  Direct Owners  •  Trusted by Thousands
              </Text>
              <Pressable onPress={() => router.push('/search')} style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.9 }]}>
                <Text style={styles.heroCtaText}>Explore Properties</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brand} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Search + quick actions sit on the ivory band */}
        <View style={styles.quickStatsBand}>
          {/* Search — white pill floating up over the hero's bottom edge */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={propertyIdQuery}
              onChangeText={setPropertyIdQuery}
              onSubmitEditing={goSearch}
              returnKeyType="search"
              placeholder="Search locality, landmark, project or property"
              placeholderTextColor={colors.mutedLight}
              style={styles.searchInput}
              numberOfLines={1}
            />
            <Pressable onPress={openFilters} style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.85 }]} hitSlop={6}>
              <Ionicons name="options-outline" size={16} color="#fff" />
              <Text style={styles.filterBtnText}>Filters</Text>
            </Pressable>
          </View>

          {/* Quick actions — white card, pale sage circles, faint dividers */}
          <View style={styles.quickCard}>
            <QuickAction icon="home-outline"     label="Buy"  onPress={() => goBrowse('SALE')} />
            <View style={styles.quickDivider} />
            <QuickAction icon="key-outline"      label="Rent" onPress={() => goBrowse('RENT')} />
            <View style={styles.quickDivider} />
            <QuickAction icon="business-outline" label="Commercial" onPress={goCommercial} />
            <View style={styles.quickDivider} />
            <QuickAction icon="leaf-outline"     label="Plots" onPress={goPlots} />
          </View>
        </View>

        {/* Featured Properties */}
        <Section compact title="Featured Property" icon="star" bleed action={{ label: 'View All', onPress: () => router.push('/search') }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            snapToInterval={FEATURED_W + 12}
            decelerationRate="fast"
            onScroll={(e) => setFeaturedIndex(Math.round(e.nativeEvent.contentOffset.x / (FEATURED_W + 12)))}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 12, alignItems: 'flex-start' }}
          >
            {/* Skeletons while the rail is empty, NOT property-less cards. The
                fallback used to be three real cards with no property, which
                painted an empty pale-sage photo box and read as a loaded card
                whose image had failed — not as loading. */}
            {topFeatured.length === 0
              ? Array.from({ length: 2 }, (_, i) => (
                  <FeaturedCardSkeleton key={i} width={FEATURED_W} imageHeight={FEATURED_IMG_H} imageWidth={FEATURED_IMG_W} />
                ))
              : topFeatured.map((p) => (
                  <FeaturedCollectionCard
                    key={p.id}
                    property={p}
                    saved={savedIds.has(p.id)}
                    onToggleSave={toggleSave}
                    onPress={() => router.push(`/properties/${p.id}`)}
                  />
                ))}
          </ScrollView>

          {/* Page dots — the card stack is short enough now that the rail needs
              to say how many there are. */}
          {topFeatured.length > 1 ? (
            <View style={styles.dots}>
              {topFeatured.map((p, i) => (
                <View key={p.id} style={[styles.dot, i === featuredIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </Section>

        {/* Recommended For You — newest in the selected city */}
        {recent.length > 0 ? (
          <Section title="Recommended For You" icon="sparkles" bleed background={colors.bg} action={{ label: 'View All', onPress: () => router.push('/search') }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              overScrollMode="never"
              snapToInterval={MINI_CARD_WIDTH + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 12, alignItems: 'flex-start' }}
            >
              {recent.slice(0, 8).map((p) => (
                <PropertyMiniCard
                  key={p.id}
                  item={p}
                  saved={savedIds.has(p.id)}
                  onToggleSave={toggleSave}
                  onPress={() => router.push(`/properties/${p.id}`)}
                />
              ))}
            </ScrollView>
          </Section>
        ) : null}

        {/* Recent listings */}
        {loading ? (
          <ListSkeleton count={3} />
        ) : recent.length > 0 ? (
          <Section title={`Recent in ${city.name}`} background={colors.white} action={{ label: 'View All', onPress: () => router.push('/search') }}>
            {recent.slice(0, 6).map((p) => (
              <RecentRow key={p.id} item={p} onPress={() => router.push(`/properties/${p.id}`)} />
            ))}
          </Section>
        ) : null}
      </Animated.ScrollView>

      <CityPickerSheet visible={cityPickerOpen} onClose={() => setCityPickerOpen(false)} />
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

// `compact` is the tighter header used by Featured: a smaller title and less
// vertical air, so the section clears the fold on a 6"-class phone.
function Section({ title, subtitle, icon, background = colors.white, bleed = false, compact = false, action, children }: { title: string; subtitle?: string; icon?: React.ComponentProps<typeof Ionicons>['name']; background?: string; bleed?: boolean; compact?: boolean; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  const headerPad = bleed ? { paddingHorizontal: 16 } : null
  return (
    <View style={[styles.section, compact && styles.sectionCompact, bleed && { paddingHorizontal: 0 }, { backgroundColor: background }]}>
      <View style={[styles.sectionHeaderRow, headerPad]}>
        <View style={styles.sectionTitleRow}>
          {icon ? <Ionicons name={icon} size={compact ? 17 : 20} color={colors.accent} /> : null}
          <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text>
        </View>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8} style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.7 }]}>
            <Text style={styles.sectionActionText}>{action.label}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>
      {/* Icon-led headers (Featured) carry the gold accent in the icon already. */}
      {icon ? null : <View style={[styles.sectionAccentBar, bleed && { marginLeft: 16 }]} />}
      {subtitle ? <Text style={[styles.sectionSub, headerPad]}>{subtitle}</Text> : null}
      <View style={{ marginTop: compact ? 6 : 12 }}>{children}</View>
    </View>
  )
}

// `property` is required: the rail renders FeaturedCardSkeleton while it is
// empty, so this component no longer has a property-less state to draw.
function FeaturedCollectionCard({ property, saved, onToggleSave, onPress }: { property: PropertyCard; saved: boolean; onToggleSave: (id: string) => void; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.featured, pressed && { opacity: 0.9 }]}>
      {/* Photo column. The badges hang off this View, not the card, so they stay
          pinned to the photo's rounded corners. */}
      <View style={styles.featuredPhoto}>
        {property.primaryImageUrl ? (
          <Image source={{ uri: property.primaryImageUrl }} style={styles.featuredImg} resizeMode="cover" />
        ) : (
          <View style={[styles.featuredImg, styles.noImage, { backgroundColor: colors.brandTint }]}>
            <Ionicons name="image-outline" size={30} color={colors.mutedLight} />
          </View>
        )}

        {/* Featured badge, top-left. Verification is a separate fact and is stated
            once, by the pill below — never inferred from "not featured". */}
        {property.isFeatured ? (
          <View style={[styles.featuredBadge, styles.featuredBadgePremium]}>
            <Ionicons name="star" size={11} color={colors.accent} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        ) : null}

        {/* Heart, top-right — solid white circle per the Green Growth mock */}
        <Pressable
          onPress={() => onToggleSave(property.id)}
          hitSlop={8}
          style={({ pressed }) => [styles.featuredHeart, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? colors.accent : colors.brand} />
        </Pressable>

        {/* Photo count, bottom-left of the photo */}
        {property.imageCount > 1 ? (
          <View style={styles.photoPill}>
            <Ionicons name="images-outline" size={11} color="#fff" />
            <Text style={styles.photoPillText}>{property.imageCount}</Text>
          </View>
        ) : null}
      </View>

      {/* Facts column. Location leads here rather than the title — the column is
          narrow, and it is the line that orients you fastest. Otherwise the order
          is the app's usual one: title, price, specs, chips. */}
      <View style={styles.featuredInfo}>
        <CardLocation size={FEATURED_MINOR} item={property} />
        <CardTitle size={HERO_SIZE}>{property.title}</CardTitle>
        <CardPrice size={HERO_SIZE}>{formatPrice(property.price, property.priceUnit)}</CardPrice>
        {/* Beds + area only: the third cell used to be the property type, which
            is now a chip, and baths would not survive this column's width. */}
        <CardSpecs size={FEATURED_MINOR} specs={listingSpecs(property, { baths: false })} style={styles.featuredSpecs} />
        <View style={styles.chipRow}>
          {property.isVerified ? (
            <CardChip size={FEATURED_MINOR} icon="shield-checkmark-outline" label="Verified" />
          ) : null}
          <CardChip size={FEATURED_MINOR} icon="business-outline" label={propertyTypeLabel(property.propertyType)} />
        </View>
      </View>
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
        <CardTitle size={ROW_SIZE}>{item.title}</CardTitle>
        <CardLocation size={ROW_SIZE} item={item} />
        {/* The price row carries the Verified chip on its right — the slack the
            old right-aligned "1200 sqft" left sitting empty. */}
        <View style={styles.recentPriceRow}>
          <CardPrice size={ROW_SIZE}>{formatPrice(item.price, item.priceUnit)}</CardPrice>
          {item.isVerified ? (
            <CardChip size={ROW_SIZE} icon="shield-checkmark-outline" label="Verified" />
          ) : null}
        </View>
        <CardSpecs size={ROW_SIZE} specs={listingSpecs(item)} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // Top bar — absolute *within the hero*, so it scrolls away with the photo
  header:            { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'transparent' },
  topBarInner:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6 },
  locationPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, paddingRight: 8 },
  locationCity:      { color: '#fff', fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, flexShrink: 1 },
  bellBtn:           { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellBadge:         { position: 'absolute', top: 1, right: 1, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.brand },
  bellBadgeText:     { fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, color: colors.brand },

  // Hero content sits directly on the photo (bottom-anchored over a forest scrim)
  heroWrap:          { position: 'relative' },
  heroOverlay:       { position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  // paddingBottom must clear the search bar's negative marginTop below —
  // the difference between the two is the visible gap under the CTA.
  heroContent:       { paddingHorizontal: 20, paddingBottom: 44 },
  heroHeadline:      { fontFamily: fonts.bold, fontSize: 26, lineHeight: 33, color: colors.white },
  heroHeadlineAccent:{ color: colors.accent },
  trustLine:         { fontFamily: fonts.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.92)', marginTop: 8 },
  heroCta:           { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.sm, marginTop: 13 },
  heroCtaText:       { fontFamily: fonts.bold, fontSize: 13, color: colors.brand },

  // Search — white pill floating over the hero's bottom edge
  searchBar:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.md, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, marginHorizontal: 16, marginTop: -22, ...shadow.raised },
  filterBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, height: 38, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.brand },
  filterBtnText:     { fontFamily: fonts.bold, fontSize: 12.5, color: '#fff' },
  searchInput:       { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink, padding: 0, textAlignVertical: 'center' },

  // Ivory band behind the search bar + quick actions
  quickStatsBand:    { backgroundColor: colors.bg, paddingBottom: 4 },

  // Quick actions — white card, pale sage circles, faint vertical dividers
  quickCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: radius.lg, paddingVertical: 18, borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  quickDivider:      { width: 1, height: 56, backgroundColor: colors.borderLight },
  quickAction:       { flex: 1, alignItems: 'center', gap: 9 },
  quickCircle:       { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandTint },
  quickLabel:        { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },

  // Section
  section:           { paddingHorizontal: 16, paddingVertical: 24 },
  sectionCompact:    { paddingVertical: 16 },
  sectionHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionAccentBar:  { width: 32, height: 3, borderRadius: 2, backgroundColor: colors.accent, marginTop: 8 },
  sectionTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle:      { ...typography.h2 },
  sectionTitleCompact: { fontSize: 17, lineHeight: 23 },
  sectionAction:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brand },
  sectionSub:        { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6 },

  // Featured — one card per page: inset photo on the left, facts on the right
  featured:          { width: FEATURED_W, flexDirection: 'row', gap: 12, padding: FEATURED_PAD, borderRadius: radius.lg, backgroundColor: colors.white, ...shadow.card },
  featuredPhoto:     { width: FEATURED_IMG_W, height: FEATURED_IMG_H, borderRadius: radius.md, overflow: 'hidden' },
  featuredImg:       { width: '100%', height: '100%' },
  featuredBadge:        { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  featuredBadgePremium: { backgroundColor: colors.brand },
  featuredBadgeText:    { fontFamily: fonts.semibold, fontSize: 10, color: '#fff', lineHeight: 13 },
  featuredHeart:        { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, ...shadow.card },
  photoPill:         { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,51,47,0.72)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.sm },
  photoPillText:     { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 13, color: '#fff' },
  featuredInfo:      { flex: 1, justifyContent: 'center', paddingRight: 4, gap: CARD_SCALE.md.gap },
  featuredSpecs:     { marginTop: 1 },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },

  // Carousel dots
  dots:              { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  dot:               { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive:         { width: 18, backgroundColor: colors.brand },

  // Recent listings
  // Photo stretches to whatever the body needs instead of being a fixed 108
  // square — the body grew a spec strip, and a square left a notch of dead white
  // under the photo.
  recent:            { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', ...shadow.card },
  recentImg:         { width: 112, alignSelf: 'stretch', minHeight: 112, backgroundColor: colors.border },
  noImage:           { alignItems: 'center', justifyContent: 'center' },
  recentBody:        { flex: 1, paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center', gap: CARD_SCALE.md.gap },
  recentPriceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 },
})
