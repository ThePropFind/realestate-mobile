import { useCallback, useEffect, useState } from 'react'
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../../src/components/Text'
import { ListSkeleton } from '../../src/components/Skeleton'
import { PropertyResultCard } from '../../src/components/property/PropertyResultCard'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { activeFilterCount, filtersFromParams, filtersToParams, type SearchFilters } from '../../src/lib/searchFilters'
import { CityPickerSheet } from '../../src/components/CityPickerSheet'
import { NotificationsSheet } from '../../src/components/NotificationsSheet'
import { appAlert } from '../../src/components/AppAlert'
import { favoritesApi, propertyApi } from '../../src/lib/api'
import { useNoticeCount } from '../../src/lib/notifications'
import { useAuthStore } from '../../src/store/authStore'
import { useLocationStore } from '../../src/store/locationStore'
import { colors, fonts, radius, shadow, typography } from '../../src/theme'
import type { PropertyCard, PropertyType, SearchParams } from '../../src/types'

const BRAND = colors.brand
const ACCENT = colors.accent
const COMMERCIAL: PropertyType[] = ['COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP']

// The four category tabs. Each is a shorthand for a set of search filters, so
// the filter object stays the single source of truth and the sheet and the tabs
// can never disagree (PG, set from the sheet, simply lights no tab).
type Category = 'SALE' | 'RENT' | 'COMMERCIAL' | 'PLOT'
const CATEGORIES: { key: Category; label: string; title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'SALE',       label: 'Buy',        title: 'Buy Properties',        icon: 'home-outline' },
  { key: 'RENT',       label: 'Rent',       title: 'Rent Properties',       icon: 'key-outline' },
  { key: 'COMMERCIAL', label: 'Commercial', title: 'Commercial Properties', icon: 'business-outline' },
  { key: 'PLOT',       label: 'Plots',      title: 'Plots & Land',          icon: 'leaf-outline' },
]

function categoryOf(f: SearchFilters): Category | undefined {
  if (f.propertyType === 'PLOT') return 'PLOT'
  if (f.propertyTypes?.length && f.propertyTypes.every((t) => COMMERCIAL.includes(t))) return 'COMMERCIAL'
  if (f.listingType === 'SALE' || f.listingType === 'RENT') return f.listingType
  return undefined
}

type SortKey = 'date' | 'priceAsc' | 'priceDesc' | 'area'

export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  // Loosely typed on purpose — filtersFromParams owns the parsing, and the
  // filter screen can add a param without this signature going stale.
  // `q` stays typed (it feeds the keyword box); the rest is deliberately loose
  // so filtersFromParams owns the parsing and the filter screen can add a param
  // without this signature going stale.
  const params = useLocalSearchParams<{ q?: string }>() as
    { q?: string } & Record<string, string | string[] | undefined>

  const city = useLocationStore((s) => s.city)
  const [keyword, setKeyword] = useState(params.q ?? '')
  // Submitted keyword — sent to the server so matches beyond the fetched page are found
  // (the old client-only filter silently missed anything past the first 30 results).
  const [query, setQuery] = useState(params.q ?? '')
  // Seeded from the route params — the filter screen and the home tiles both
  // arrive here that way, so one parser covers every entry point.
  const [filters, setFilters] = useState<SearchFilters>(() => filtersFromParams(params))
  // /search is a mounted tab, so the initializer above does NOT re-run when the
  // filter modal navigates back with a new selection. Re-sync on param change.
  // Keyed off a serialized copy because useLocalSearchParams returns a fresh
  // object identity every render.
  const paramsKey = JSON.stringify(params)
  useEffect(() => {
    setFilters(filtersFromParams(JSON.parse(paramsKey) as Record<string, string | string[] | undefined>))
  }, [paramsKey])

  const category = categoryOf(filters)

  const [cityPickerOpen, setCityPickerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const filterCount = activeFilterCount(filters)
  const noticeCount = useNoticeCount()

  // Sort — "Newest" and "Area" double as direction toggles (the chevron flips).
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [newestFirst, setNewestFirst] = useState(true)
  const [largestFirst, setLargestFirst] = useState(true)
  const sort = sortKey === 'priceAsc'  ? 'price,asc'
             : sortKey === 'priceDesc' ? 'price,desc'
             : sortKey === 'area'      ? `areaSqft,${largestFirst ? 'desc' : 'asc'}`
             : `createdAt,${newestFirst ? 'desc' : 'asc'}`

  const [items, setItems] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const apiParams: SearchParams = { citySlug: city.slug, page: 0, size: 30, sort, ...filters }
      if (query.trim()) apiParams.keyword = query.trim()
      const { data } = await propertyApi.search(apiParams)
      setItems(data.content)
    } catch { setItems([]) }
    finally { setLoading(false); setRefreshing(false) }
  }, [query, city.slug, filters, sort])

  useEffect(() => { setLoading(true); void load() }, [load])

  // Tabs are mutually exclusive: picking one clears the other category fields,
  // tapping the active one clears back to "everything".
  const pickCategory = (key: Category) => setFilters((f) => {
    const base = { ...f, listingType: undefined, propertyType: undefined, propertyTypes: undefined }
    if (categoryOf(f) === key) return base
    if (key === 'COMMERCIAL') return { ...base, propertyTypes: COMMERCIAL }
    if (key === 'PLOT')       return { ...base, propertyType: 'PLOT' as PropertyType }
    return { ...base, listingType: key }
  })

  const pickSort = (key: SortKey) => {
    if (key === 'date'  && sortKey === 'date') setNewestFirst((v) => !v)
    if (key === 'area'  && sortKey === 'area') setLargestFirst((v) => !v)
    setSortKey(key)
  }

  // Saved hearts — refreshed on focus (the Saved tab can change the set),
  // optimistic toggle with revert on failure.
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

  // ponytail: the card DTO carries no owner phone, so Call/WhatsApp fetch the
  // detail on tap. Add `ownerPhone` to PropertyCardResponse if this feels slow.
  const contact = useCallback(async (item: PropertyCard, mode: 'call' | 'whatsapp') => {
    try {
      const { data } = await propertyApi.getById(item.id)
      const digits = (data.owner.phone || '').replace(/\D/g, '')
      const phone = digits ? (digits.length === 10 ? `91${digits}` : digits) : ''
      if (!phone) return appAlert('No phone number', 'The owner has not shared a phone number.')
      if (mode === 'call') {
        Linking.openURL(`tel:+${phone}`).catch(() => appAlert('Could not open dialer'))
      } else {
        const text = encodeURIComponent(`Hi, I'm interested in your listing "${item.title}" on PropFind.`)
        Linking.openURL(`https://wa.me/${phone}?text=${text}`).catch(() => appAlert('WhatsApp not installed'))
      }
    } catch { appAlert('Could not reach the owner', 'Please try again.') }
  }, [])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header — title + city picker + notifications */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.push('/')} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{CATEGORIES.find((c) => c.key === category)?.title ?? 'All Properties'}</Text>
          <Pressable onPress={() => setCityPickerOpen(true)} style={styles.cityRow} hitSlop={6}>
            <Ionicons name="location" size={14} color={colors.ink} />
            <Text style={styles.cityText}>{city.name}, {city.state}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.ink} />
          </Pressable>
        </View>
        <Pressable onPress={() => setNotifOpen(true)} hitSlop={8} style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={26} color={colors.ink} />
          {noticeCount > 0 ? (
            <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{noticeCount}</Text></View>
          ) : null}
        </Pressable>
      </View>

      {/* Search, tabs and sort scroll WITH the results — they are part of the
          list body, not the fixed header. */}
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={BRAND} />}
        ListHeaderComponent={
          <View>
            {/* Search + Filters */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={21} color={colors.brand} />
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                onSubmitEditing={() => setQuery(keyword)}
                returnKeyType="search"
                placeholder="Search locality, landmark or project"
                placeholderTextColor={colors.mutedLight}
                style={styles.searchInput}
                numberOfLines={1}
              />
              {query.trim() ? (
                <Pressable onPress={() => { setKeyword(''); setQuery('') }} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedLight} />
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.push({ pathname: '/filters', params: filtersToParams(filters) })} style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.85 }]}>
                <Ionicons name="options-outline" size={18} color="#fff" />
                <Text style={styles.filterBtnText}>Filters</Text>
                {filterCount > 0 ? (
                  <View style={styles.filterCount}><Text style={styles.filterCountText}>{filterCount}</Text></View>
                ) : null}
              </Pressable>
            </View>

            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hRow} contentContainerStyle={styles.tabRow}>
              {CATEGORIES.map((c) => {
                const on = category === c.key
                return (
                  <Pressable key={c.key} onPress={() => pickCategory(c.key)} style={[styles.tab, on && styles.tabActive]}>
                    <Ionicons name={c.icon} size={18} color={on ? '#fff' : colors.ink} />
                    <Text style={[styles.tabText, on && styles.tabTextActive]}>{c.label}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Sort */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hRow} contentContainerStyle={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort by</Text>
              <SortChip label={newestFirst ? 'Newest' : 'Oldest'} on={sortKey === 'date'} chevron={newestFirst ? 'chevron-down' : 'chevron-up'} onPress={() => pickSort('date')} />
              <SortChip label="Price: Low to High" on={sortKey === 'priceAsc'} onPress={() => pickSort('priceAsc')} />
              <SortChip label="Price: High to Low" on={sortKey === 'priceDesc'} onPress={() => pickSort('priceDesc')} />
              <SortChip label="Area" on={sortKey === 'area'} chevron={largestFirst ? 'chevron-down' : 'chevron-up'} onPress={() => pickSort('area')} />
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <PropertyResultCard
            item={item}
            saved={savedIds.has(item.id)}
            onToggleSave={toggleSave}
            onContact={contact}
            onPress={() => router.push(`/properties/${item.id}`)}
          />
        )}
        ListEmptyComponent={loading ? <ListSkeleton /> : (
          <View style={styles.center}>
            <View style={styles.emptyIcon}><Ionicons name="search" size={34} color={colors.brand} /></View>
            <Text style={styles.empty}>No matches in {city.name} for this filter.</Text>
          </View>
        )}
      />

      <CityPickerSheet visible={cityPickerOpen} onClose={() => setCityPickerOpen(false)} />
      <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </SafeAreaView>
  )
}

/** Route params arrive as strings; drop anything non-numeric. */
function num(v?: string): number | undefined {
  const n = Number(v)
  return v && Number.isFinite(n) ? n : undefined
}

function SortChip({ label, on, chevron, onPress }: { label: string; on: boolean; chevron?: 'chevron-down' | 'chevron-up'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.sortChip, on && styles.sortChipActive]}>
      <Text style={[styles.sortChipText, on && styles.sortChipTextActive]}>{label}</Text>
      {chevron ? <Ionicons name={chevron} size={15} color={on ? BRAND : colors.ink} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },

  // Top-aligned: the back arrow sits on the title's line, the city row tucks
  // under the title's first letter (not under the arrow).
  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  backBtn:     { marginTop: 3 },
  // typography.screenTitle. Was 24/31 — the single largest heading in the app
  // after home's hero, on a screen that is a list of results, not a landing.
  headerTitle: { ...typography.screenTitle },
  cityRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  cityText:    { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.ink },
  bellBtn:     { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bellBadge:   { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: '#fff' },

  // Same recipe as the home search bar (app/(tabs)/index.tsx → searchBar):
  // textAlignVertical + zero padding is what keeps the text on the icon's centre.
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, marginHorizontal: 16, marginTop: 6, borderRadius: radius.lg, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, ...shadow.card },
  // 13, matching home's search field — this row is the same control.
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink, padding: 0, textAlignVertical: 'center' },
  filterBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: BRAND, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  filterBtnText:   { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17, color: '#fff' },
  filterCount:     { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: BRAND },

  // RN's ScrollView base style is { flexGrow: 1, flexShrink: 1 }. Left alone in a
  // column that means a horizontal row either balloons into the spare space or —
  // the bug that kept clipping these pills — gets SHRUNK below its own content by
  // a greedy sibling, even with an explicit height. Pin both.
  hRow:        { flexGrow: 0, flexShrink: 0 },
  // 'flex-start' keeps the pills at their intrinsic height instead of stretching.
  tabRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 16, paddingVertical: 12 },
  tab:         { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tabActive:   { backgroundColor: BRAND, borderColor: BRAND },
  tabText:     { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  tabTextActive:{ color: '#fff' },

  sortRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  // marginTop instead of alignSelf: 'center' — see the note on tabRow.
  sortLabel:   { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 18, color: colors.ink, marginRight: 2, marginTop: 8 },
  // Selected chip is white-with-a-border in the mock, not a filled brand pill.
  sortChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: '#ECEAE4', borderWidth: 1, borderColor: 'transparent' },
  sortChipActive: { backgroundColor: colors.white, borderColor: BRAND },
  sortChipText:   { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  sortChipTextActive: { fontFamily: fonts.semibold },

  center:      { padding: 60, alignItems: 'center' },
  emptyIcon:   { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  empty:       { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 12, textAlign: 'center' },

})
