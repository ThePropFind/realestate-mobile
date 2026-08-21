import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../../src/components/Text'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { propertyApi } from '../../src/lib/api'
import { appAlert } from '../../src/components/AppAlert'
import { useLocationStore } from '../../src/store/locationStore'
import { MapPriceMarker } from '../../src/components/MapPriceMarker'
import { MapPropertyCarousel, SNAP } from '../../src/components/MapPropertyCarousel'
import { MapQuickFilters } from '../../src/components/MapQuickFilters'
import {
  activeFilterCount, filtersFromParams, filtersToParams, type SearchFilters,
} from '../../src/lib/searchFilters'
import { colors, fonts, radius, shadow } from '../../src/theme'
import type { ListingType, PropertyCard, PropertyType, SearchParams } from '../../src/types'

const BRAND = colors.brand

// The map asks for exactly the controller's page ceiling (Math.min(size, 100)).
// Anything past it does not exist as far as this screen is concerned, which is
// why the result count below is shown rather than hidden — see `capped`.
const PAGE_SIZE = 100

// Coimbatore city center — the fallback viewport before any bounds search.
const COIMBATORE: Region = {
  latitude: 11.0168,
  longitude: 76.9558,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
}

/** The map's viewport, as the four params PropertySearchRequest binds. */
type Bounds = Pick<SearchParams, 'neLat' | 'neLng' | 'swLat' | 'swLng'>

// Category chips → the property types each one selects. `null` = every type.
// A chip is a shorthand for a filter value, exactly like the Search tab's
// category tabs, so `filters` stays the single source of truth and the chips
// and the filter modal can never disagree.
const CATEGORIES: {
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  types: PropertyType[] | null
}[] = [
  { label: 'All',        icon: 'apps-outline',       types: null },
  { label: 'Plots',      icon: 'map-outline',        types: ['PLOT'] },
  { label: 'Agri Land',  icon: 'leaf-outline',       types: ['AGRICULTURAL_LAND'] },
  { label: 'Apartments', icon: 'business-outline',   types: ['APARTMENT', 'BUILDER_FLOOR'] },
  { label: 'Villas',     icon: 'home-outline',       types: ['VILLA', 'INDEPENDENT_HOUSE'] },
  { label: 'Commercial', icon: 'storefront-outline', types: ['COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP'] },
  { label: 'PG',         icon: 'bed-outline',        types: ['PG_HOSTEL'] },
]

/**
 * Which chip the current filters stand for. `-1` means the filter modal picked
 * a type combination no chip represents — the chips then all go quiet rather
 * than lighting up a lie.
 */
function categoryOf(f: SearchFilters): number {
  const sel = f.propertyTypes ?? (f.propertyType ? [f.propertyType] : [])
  if (!sel.length) return 0
  return CATEGORIES.findIndex((c) =>
    c.types != null && c.types.length === sel.length && c.types.every((t) => sel.includes(t)))
}

/** Corners of a region, in the order the backend's two `between` predicates want. */
function boundsOf(r: Region): Bounds {
  return {
    neLat: r.latitude + r.latitudeDelta / 2,
    neLng: r.longitude + r.longitudeDelta / 2,
    swLat: r.latitude - r.latitudeDelta / 2,
    swLng: r.longitude - r.longitudeDelta / 2,
  }
}

/**
 * Has the map moved far enough from what the current results were fetched for
 * to be worth re-querying? A quarter of a screen of pan, or a halving/doubling
 * of the zoom. Anything less and "Search this area" would flicker on during the
 * settle animation after a marker tap.
 */
function movedEnough(from: Region, to: Region): boolean {
  const panned =
    Math.abs(from.latitude - to.latitude) > to.latitudeDelta * 0.25 ||
    Math.abs(from.longitude - to.longitude) > to.longitudeDelta * 0.25
  const zoomed = Math.abs(Math.log2(from.latitudeDelta / to.latitudeDelta)) > 0.5
  return panned || zoomed
}

export default function MapScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const city = useLocationStore((s) => s.city)

  // Filters arrive as route params — from the filter modal (which we open with
  // `origin=map` so Apply comes back here) and from any deep link. Same parser
  // and same re-sync as the Search tab, because the map is a mounted tab too
  // and the state initialiser does not re-run when new params are delivered.
  // Loosely typed on purpose — filtersFromParams owns the parsing, so the
  // filter screen can add a param without this signature going stale.
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>
  const [filters, setFilters] = useState<SearchFilters>(() => filtersFromParams(params))
  const paramsKey = JSON.stringify(params)
  useEffect(() => {
    setFilters(filtersFromParams(JSON.parse(paramsKey) as Record<string, string | string[] | undefined>))
  }, [paramsKey])

  const [items, setItems] = useState<PropertyCard[]>([])
  const [total, setTotal] = useState(0)
  // How many rows the page actually returned, mappable or not. Compared against
  // `total` to detect the page ceiling — comparing against `items` instead would
  // blame the cap for listings that are merely missing coordinates.
  const [fetched, setFetched] = useState(0)
  const [loading, setLoading] = useState(true)
  // Typed vs submitted. The keyword goes to the server: the old client-side
  // filter could only ever match within the fetched page, so the 101st listing
  // in a city was genuinely unfindable from this screen.
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Set to a listing id when the camera still owes it a move; consumed by the
  // pan effect once the map surface is ready.
  const [pendingPan, setPendingPan] = useState<string | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [canSearchArea, setCanSearchArea] = useState(false)
  const [hasLocationPerm, setHasLocationPerm] = useState(false)
  const [locating, setLocating] = useState(false)
  // Height of the bottom stack (carousel + quick filters), measured so the
  // floating controls can sit just above it instead of guessing. Seeded with a
  // close-enough estimate purely so the controls do not render behind the tab
  // bar for the one frame before onLayout reports the real height.
  const [bottomStackH, setBottomStackH] = useState(300)
  // Bumped on every screen focus. Feeds each marker's `refresh` prop (re-arms
  // its tracksViewChanges so the pill re-rasterises) and, via the selected
  // marker's key, forces that marker to re-add on top when you return.
  const [focusEpoch, setFocusEpoch] = useState(0)
  const [mapReady, setMapReady] = useState(false)

  const mapRef = useRef<MapView>(null)
  const listRef = useRef<FlatList<PropertyCard>>(null)
  // Latest camera position, and the one the current results were fetched for.
  const regionRef = useRef<Region>(COIMBATORE)
  const queriedRegionRef = useRef<Region>(COIMBATORE)
  // Read synchronously inside `load`, where the state value would still be stale.
  const selectedIdRef = useRef<string | null>(null)
  // True while one of OUR animations is in flight, so the settle it produces is
  // not mistaken for the user panning away from their results.
  const selfMoveRef = useRef(false)
  // Sequence number of the newest issued search. Chips, the quick strip, the
  // keyword box and "Search this area" can all fire a load in quick succession,
  // and without this a slower earlier response can land last and win.
  const reqRef = useRef(0)

  const select = useCallback((id: string | null) => {
    selectedIdRef.current = id
    setSelectedId(id)
  }, [])

  const category = categoryOf(filters)
  const filterCount = activeFilterCount(filters)
  // The page ceiling is real; say so rather than silently dropping listings.
  const capped = total > fetched

  const load = useCallback(async () => {
    const seq = ++reqRef.current
    try {
      const apiParams: SearchParams = { page: 0, size: PAGE_SIZE, ...filters }
      // Bounds and city are alternatives, never both: once the user has asked
      // to search a drawn-out viewport, a city filter on top of it would blank
      // the results the moment they panned past the city line.
      if (bounds) Object.assign(apiParams, bounds)
      else apiParams.citySlug = city.slug
      if (query.trim()) apiParams.keyword = query.trim()

      const { data } = await propertyApi.search(apiParams)
      if (seq !== reqRef.current) return   // superseded while in flight
      // Only listings with real coordinates can be plotted.
      const mapped = data.content.filter((p) => p.latitude != null && p.longitude != null)
      setItems(mapped)
      setTotal(data.totalElements)
      setFetched(data.content.length)

      // Keep the current selection when it survived the new query; otherwise
      // fall back to the first card, which is what the carousel shows.
      const prev = selectedIdRef.current
      const next = prev && mapped.some((p) => p.id === prev) ? prev : mapped[0]?.id ?? null
      select(next)
      if (next && next !== prev) {
        setPendingPan(next)
        listRef.current?.scrollToOffset({ offset: 0, animated: false })
      }
      queriedRegionRef.current = regionRef.current
      setCanSearchArea(false)
    } catch {
      if (seq !== reqRef.current) return
      setItems([])
      setTotal(0)
      setFetched(0)
      select(null)
    } finally {
      if (seq === reqRef.current) setLoading(false)
    }
  }, [filters, bounds, query, city.slug, select])

  useEffect(() => { setLoading(true); void load() }, [load])

  // Refocus only re-arms marker rasterisation. It deliberately does NOT refetch:
  // the old focus-effect reload replaced `items` on every tab switch, which was
  // half of why the camera effect kept firing and yanking the view back.
  useFocusEffect(useCallback(() => { setFocusEpoch((e) => e + 1) }, []))

  // Show the blue dot straight away if location was already granted, without
  // prompting — the prompt belongs to the My Location button.
  useEffect(() => {
    void Location.getForegroundPermissionsAsync()
      .then(({ status }) => setHasLocationPerm(status === 'granted'))
      .catch(() => setHasLocationPerm(false))
  }, [])

  // Draw the selected marker LAST — Android's Google Maps ignores marker zIndex
  // for custom views on overlap and paints in child order, so the active pill
  // would otherwise hide behind a neighbour at the same spot.
  const ordered = useMemo(() => {
    if (!selectedId) return items
    const sel = items.find((p) => p.id === selectedId)
    if (!sel) return items
    return [...items.filter((p) => p.id !== selectedId), sel]
  }, [items, selectedId])

  /**
   * Every camera move we make ourselves goes through here, flagged so
   * `onRegionChangeComplete` can tell it apart from a real pan. The flag also
   * clears on a timer: if the target happens to equal the current camera the
   * map emits no settle at all, and a stuck flag would swallow the user's next
   * pan.
   */
  const animateTo = useCallback((region: Region, duration: number) => {
    selfMoveRef.current = true
    setTimeout(() => { selfMoveRef.current = false }, duration + 300)
    mapRef.current?.animateToRegion(region, duration)
  }, [])

  /** Centre on a listing, keeping the user's current zoom rather than forcing one. */
  const panTo = useCallback((lat: number, lng: number) => {
    const r = regionRef.current
    animateTo({
      latitude: lat,
      longitude: lng,
      latitudeDelta: r.latitudeDelta,
      longitudeDelta: r.longitudeDelta,
    }, 300)
  }, [animateTo])

  // The camera moves for exactly two reasons: a fresh auto-selection whose pin
  // is off-screen, and a carousel swipe. It used to animate to a fixed 0.05
  // delta on every selection change with `items` in its deps, so it reset the
  // user's zoom on every marker tap and re-fired on every refetch — which would
  // have fought "Search this area" directly.
  useEffect(() => {
    if (!mapReady || !pendingPan) return
    const sel = items.find((p) => p.id === pendingPan)
    setPendingPan(null)
    if (sel?.latitude == null || sel.longitude == null) return
    const r = regionRef.current
    // 0.7 of the half-span, not the whole of it: the carousel covers the bottom
    // of the map, so a pin technically inside the region can still be hidden.
    const inView =
      Math.abs(sel.latitude - r.latitude) < (r.latitudeDelta / 2) * 0.7 &&
      Math.abs(sel.longitude - r.longitude) < (r.longitudeDelta / 2) * 0.7
    if (!inView) panTo(sel.latitude, sel.longitude)
  }, [mapReady, pendingPan, items, panTo])

  const onRegionChangeComplete = useCallback((r: Region) => {
    regionRef.current = r
    if (selfMoveRef.current) {
      // Our own pan (carousel swipe, My Location, off-screen auto-select).
      // Rebase the comparison point instead of offering to re-query a move the
      // user never made — otherwise every card swipe pops the button open.
      selfMoveRef.current = false
      queriedRegionRef.current = r
      return
    }
    setCanSearchArea(movedEnough(queriedRegionRef.current, r))
  }, [])

  const searchThisArea = useCallback(() => {
    setBounds(boundsOf(regionRef.current))
    setCanSearchArea(false)
  }, [])

  // Marker tap → select + scroll the carousel to its card. No camera move: the
  // pin you just tapped is by definition already on screen.
  const onMarkerPress = useCallback((item: PropertyCard) => {
    select(item.id)
    const idx = items.findIndex((p) => p.id === item.id)
    if (idx >= 0) listRef.current?.scrollToOffset({ offset: idx * SNAP, animated: true })
  }, [items, select])

  // Carousel swipe → follow it with the camera; the card you swiped to is very
  // often off-screen.
  const onSnap = useCallback((item: PropertyCard) => {
    select(item.id)
    if (item.latitude != null && item.longitude != null) panTo(item.latitude, item.longitude)
  }, [panTo, select])

  const pickCategory = (i: number) => {
    const types = CATEGORIES[i].types
    setFilters((f) => ({
      ...f,
      propertyType: undefined,
      // Tapping the live chip clears back to everything.
      propertyTypes: types && categoryOf(f) !== i ? types : undefined,
    }))
  }

  const pickListingType = (t: ListingType) => {
    setFilters((f) => ({ ...f, listingType: f.listingType === t ? undefined : t }))
  }

  const openFilters = () => router.push({
    pathname: '/filters',
    // `origin` tells the modal to come back here on Apply instead of /search.
    params: { ...filtersToParams(filters), origin: 'map' },
  })

  const goToMyLocation = async () => {
    try {
      setLocating(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        appAlert('Permission needed', 'Allow location access to centre the map on where you are.')
        return
      }
      setHasLocationPerm(true)
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      animateTo({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500)
    } catch {
      appAlert('Could not get location', 'Check that location services are switched on and try again.')
    } finally {
      setLocating(false)
    }
  }

  const submitKeyword = () => {
    setQuery(keyword)
    // A text search is a fresh question about the whole city, not about the
    // rectangle the user happens to be looking at.
    setBounds(null)
  }

  const clearKeyword = () => { setKeyword(''); setQuery(''); setBounds(null) }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={COIMBATORE}
          // Standard, not hybrid: satellite imagery fights the price pills for
          // contrast and was the main reason this screen looked nothing like
          // the design.
          mapType="standard"
          onPress={() => select(null)}
          onMapReady={() => setMapReady(true)}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={hasLocationPerm}
          showsMyLocationButton={false}
          // The floating controls own the bottom-right corner.
          toolbarEnabled={false}
        >
          {ordered.map((p) => (
            <MapPriceMarker
              // Re-key the selected marker so it remounts → Android re-ADDS its
              // native marker last (a plain array reorder is only a "move" and
              // keeps the old draw order, so zIndex/ordered-last alone left the
              // active pill hidden behind an overlapping neighbour). Include
              // focusEpoch so this re-add also happens on every tab refocus —
              // otherwise a preserved selection keeps a stable key, never
              // remounts, and sinks back behind its cluster twin.
              key={p.id === selectedId ? `${p.id}:sel:${focusEpoch}` : p.id}
              item={p}
              selected={p.id === selectedId}
              refresh={focusEpoch}
              onPress={onMarkerPress}
            />
          ))}
        </MapView>

        {/* ── Top overlay: brand + List View, search + Filters, categories ── */}
        <View style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Image source={require('../../assets/icon.png')} style={styles.brandLogo} />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>PropFind</Text>
              <Text style={styles.brandTagline}>Find. Connect. Own.</Text>
            </View>
            <Pressable
              // Carry the map's filters and keyword across — List View is the
              // same result set in another presentation, not a reset. /search
              // reads the keyword from `q`.
              onPress={() => router.push({
                pathname: '/(tabs)/search',
                params: {
                  ...filtersToParams(filters),
                  ...(query.trim() ? { q: query.trim() } : {}),
                },
              })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.listViewBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="list" size={17} color={colors.ink} />
              <Text style={styles.listViewText}>List View</Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search localities, areas in ${city.name}`}
                placeholderTextColor={colors.mutedLight}
                value={keyword}
                onChangeText={setKeyword}
                onSubmitEditing={submitKeyword}
                returnKeyType="search"
                numberOfLines={1}
              />
              {keyword.length > 0 ? (
                <Pressable onPress={clearKeyword} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.mutedLight} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={openFilters}
              accessibilityRole="button"
              accessibilityLabel={`Filters${filterCount ? `, ${filterCount} active` : ''}`}
              style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="options-outline" size={18} color="#fff" />
              <Text style={styles.filterBtnText}>Filters</Text>
              {filterCount > 0 ? <View style={styles.filterDot} /> : null}
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIES.map((c, i) => {
              const on = i === category
              return (
                <Pressable
                  key={c.label}
                  onPress={() => pickCategory(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name={c.icon} size={15} color={on ? '#fff' : colors.ink} />
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* The page ceiling, made visible. Without this the 101st mapped
              listing in a city simply does not exist and nothing says so. */}
          {!loading && capped ? (
            <View style={styles.cappedPill} pointerEvents="none">
              <Ionicons name="information-circle-outline" size={13} color={colors.warning} />
              <Text style={styles.cappedText}>
                Showing {fetched} of {total} — zoom in and search this area
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Floating controls, stacked just above the bottom sheet stack ── */}
        <View
          style={[styles.controls, { bottom: bottomStackH + 14 }]}
          pointerEvents="box-none"
        >
          {canSearchArea ? (
            <Pressable
              onPress={searchThisArea}
              accessibilityRole="button"
              style={({ pressed }) => [styles.control, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="search" size={19} color={BRAND} />
              <Text style={styles.controlText}>Search{'\n'}this area</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={goToMyLocation}
            accessibilityRole="button"
            accessibilityLabel="Centre the map on my location"
            style={({ pressed }) => [styles.control, pressed && { opacity: 0.85 }]}
          >
            {locating
              ? <ActivityIndicator size="small" color={BRAND} />
              : <Ionicons name="locate" size={19} color={BRAND} />}
            <Text style={styles.controlText}>My{'\n'}Location</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : null}

        {!loading && items.length === 0 ? (
          <View style={styles.emptyOverlay} pointerEvents="none">
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={28} color={colors.mutedLight} />
              <Text style={styles.emptyText}>
                {bounds || query.trim() || filterCount > 0
                  ? 'No mapped listings match this search'
                  : `No mapped listings in ${city.name} yet`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Bottom stack: card carousel over the quick-filter strip ──
            Positioned off insets.bottom, not a bare 84: the tab bar is
            66 + insets.bottom and the Post FAB sits above it, so on
            gesture-nav Android a fixed offset hides behind both. */}
        <View
          style={[styles.bottomStack, { bottom: insets.bottom + 74 }]}
          pointerEvents="box-none"
          onLayout={(e) => setBottomStackH(e.nativeEvent.layout.height + insets.bottom + 74)}
        >
          {!loading && items.length > 0 ? (
            <MapPropertyCarousel
              ref={listRef}
              items={items}
              onOpen={(p) => router.push(`/properties/${p.id}`)}
              onSnap={onSnap}
            />
          ) : null}
          <MapQuickFilters
            filters={filters}
            onListingType={pickListingType}
            onOpenFilters={openFilters}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  mapWrap: { flex: 1 },

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 8 },

  brandRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 10 },
  brandMark: {
    width: 40, height: 40, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: BRAND,
    ...shadow.raised,
  },
  brandLogo:    { width: '100%', height: '100%' },
  brandText:    { flex: 1 },
  brandName:    { fontFamily: fonts.extra, fontSize: 18, lineHeight: 23, color: BRAND },
  brandTagline: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, color: colors.accentDeep },
  listViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white,
    ...shadow.raised,
  },
  listViewText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },

  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  searchField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, height: 46,
    ...shadow.raised,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink, paddingVertical: 0 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 46, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: BRAND,
    ...shadow.raised,
  },
  filterBtnText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: '#fff' },
  filterDot: {
    position: 'absolute', top: 8, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
  },

  chipsRow: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.white,
    ...shadow.card,
  },
  chipOn:     { backgroundColor: BRAND },
  chipText:   { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  chipTextOn: { fontFamily: fonts.bold, color: '#fff' },

  cappedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 10,
    backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill,
    ...shadow.card,
  },
  cappedText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.warning },

  controls: { position: 'absolute', right: 12, alignItems: 'flex-end', gap: 10 },
  control: {
    width: 66, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.white,
    alignItems: 'center', gap: 3,
    ...shadow.raised,
  },
  controlText: { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 12, color: colors.ink, textAlign: 'center' },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.6)' },
  emptyOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  emptyCard:      { alignItems: 'center', gap: 8, backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 16, borderRadius: radius.md, ...shadow.raised },
  emptyText:      { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },

  bottomStack: { position: 'absolute', left: 0, right: 0, gap: 10 },
})
