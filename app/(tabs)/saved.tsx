import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../../src/components/Text'
import { ListSkeleton } from '../../src/components/Skeleton'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { PropertyResultCard } from '../../src/components/property/PropertyResultCard'
import { appAlert } from '../../src/components/AppAlert'
import { favoritesApi } from '../../src/lib/api'
import { COMPARE_MAX, COMPARE_MIN, useCompareStore } from '../../src/lib/compareStore'
import { useAuthStore } from '../../src/store/authStore'
import { colors, fonts, radius, shadow, typography } from '../../src/theme'
import { PROPERTY_FACETS as FACETS, facetCounts } from '../../src/lib/propertyFacets'
import type { PropertyCard } from '../../src/types'

const BRAND  = colors.brand
const ACCENT = colors.accent

export default function SavedScreen() {
  const router = useRouter()
  const { isLoggedIn, hydrated } = useAuthStore()
  const insets = useSafeAreaInsets()
  const setCompareItems = useCompareStore((s) => s.setItems)

  const [items, setItems] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [facet, setFacet] = useState('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!hydrated) return // wait for session restore; identity change re-fires the focus effect
    if (!isLoggedIn) { setItems([]); setLoading(false); return }
    try {
      const { data } = await favoritesApi.listMine(0, 50)
      setItems(data.content)
      // Drop ticks for anything that is no longer saved (unsaved on the detail
      // screen, or removed on another device) — a selection must never outlive
      // the row it points at.
      setSelected((prev) => {
        const live = new Set(data.content.map((p) => p.id))
        const next = new Set([...prev].filter((id) => live.has(id)))
        return next.size === prev.size ? prev : next
      })
    } catch {
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [hydrated, isLoggedIn])

  // Refresh every time the tab gains focus — favorites can change from the detail screen.
  // No separate mount effect: it double-fetched on first focus (#30); useFocusEffect alone
  // covers mount, refocus, and the post-hydration re-run (load's identity changes).
  useFocusEffect(useCallback(() => { setLoading(true); load() }, [load]))

  const onRefresh = () => { setRefreshing(true); load() }

  const counts = useMemo(() => facetCounts(items), [items])

  const visible = useMemo(() => {
    const f = FACETS.find((x) => x.key === facet) ?? FACETS[0]
    const q = keyword.trim().toLowerCase()
    return items.filter((p) =>
      f.match(p) &&
      (!q || `${p.title} ${p.localityName} ${p.cityName}`.toLowerCase().includes(q)),
    )
  }, [items, facet, keyword])

  // Unsaving from here removes the row — this list IS the saved set, so leaving
  // an unhearted card sitting in it would be lying about what is saved.
  const unsave = useCallback(async (id: string) => {
    const before = items
    setItems((prev) => prev.filter((p) => p.id !== id))
    setSelected((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev); next.delete(id); return next
    })
    try {
      await favoritesApi.remove(id)
    } catch {
      setItems(before)
      appAlert('Could not remove', 'Please try again.')
    }
  }, [items])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      if (next.size >= COMPARE_MAX) {
        appAlert('Up to 4 at a time', `Compare fits ${COMPARE_MAX} properties side by side. Untick one to swap it out.`)
        return prev
      }
      next.add(id)
      return next
    })
  }, [])

  // "Select All" means all VISIBLE — ticking rows hidden behind a chip or a
  // search term would be invisible action. Capped like any other selection.
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id))
  const toggleSelectAll = () => {
    if (allVisibleSelected) { setSelected(new Set()); return }
    setSelected(new Set(visible.slice(0, COMPARE_MAX).map((p) => p.id)))
    if (visible.length > COMPARE_MAX) {
      appAlert('Selected the first 4', `Compare fits ${COMPARE_MAX} properties side by side.`)
    }
  }

  const openCompare = () => {
    const picked = items.filter((p) => selected.has(p.id))
    if (picked.length < COMPARE_MIN) return
    setCompareItems(picked)
    router.push('/compare')
  }

  if (!hydrated || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header count={0} />
        <ListSkeleton />
      </SafeAreaView>
    )
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header count={0} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="heart-outline" size={44} color={BRAND} /></View>
          <Text style={styles.emptyTitle}>Sign in to see saved properties</Text>
          <Text style={styles.emptySub}>Save listings you like and find them all in one place.</Text>
          <Pressable onPress={() => router.push('/auth/login')} style={styles.cta}>
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const selectionBarH = 64

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <Header
        count={items.length}
        searchOpen={searchOpen}
        keyword={keyword}
        onKeyword={setKeyword}
        onToggleSearch={() => {
          setSearchOpen((o) => {
            if (o) setKeyword('')
            return !o
          })
        }}
      />

      {items.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {FACETS.map((f) => {
            const on = f.key === facet
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
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{
          paddingTop: 12,
          // Clear the tab bar, and the selection bar when it is up.
          paddingBottom: insets.bottom + 96 + (items.length > 0 ? selectionBarH : 0),
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PropertyResultCard
            item={item}
            saved
            onToggleSave={unsave}
            /* No onContact: Saved drops the whole action row — Call,
               WhatsApp and View Details. Tapping the card opens it. */
            selected={selected.has(item.id)}
            onToggleSelect={toggleSelect}
            onPress={() => router.push(`/properties/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <View style={styles.emptyIcon}><Ionicons name="heart-outline" size={44} color={BRAND} /></View>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? 'No saved properties yet' : 'Nothing matches this filter'}
            </Text>
            <Text style={styles.emptySub}>
              {items.length === 0
                ? 'Tap the heart on any listing to save it for later.'
                : 'Try another category, or clear the search.'}
            </Text>
          </View>
        }
        ListFooterComponent={<ExploreCard onPress={() => router.push('/search')} />}
      />

      {items.length > 0 ? (
        <View style={[styles.selectionBar, { bottom: insets.bottom + 74, height: selectionBarH }]}>
          <Pressable
            onPress={toggleSelectAll}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allVisibleSelected }}
            hitSlop={8}
            style={({ pressed }) => [styles.selectAll, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.selectAllBox, allVisibleSelected && styles.selectAllBoxOn]}>
              {allVisibleSelected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.selectAllText}>Select All</Text>
          </Pressable>

          <Text style={styles.selectedCount}>
            {selected.size > 0 ? `${selected.size} selected` : ''}
          </Text>

          <Pressable
            onPress={openCompare}
            disabled={selected.size < COMPARE_MIN}
            accessibilityRole="button"
            accessibilityLabel={
              selected.size < COMPARE_MIN
                ? `Select at least ${COMPARE_MIN} properties to compare`
                : `Compare ${selected.size} properties`
            }
            style={({ pressed }) => [
              styles.compareBtn,
              selected.size < COMPARE_MIN && styles.compareBtnOff,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="copy-outline" size={15} color="#fff" />
            <Text style={styles.compareBtnText}>Compare</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function Header({ count, searchOpen, keyword, onKeyword, onToggleSearch }: {
  count: number
  searchOpen?: boolean
  keyword?: string
  onKeyword?: (v: string) => void
  onToggleSearch?: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Saved Properties</Text>
            {count > 0 ? (
              <View style={styles.savedPill}>
                <Ionicons name="heart" size={12} color={ACCENT} />
                <Text style={styles.savedPillText}>{count} saved</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.headerSub}>Your favorite properties, all in one place.</Text>
        </View>

        {onToggleSearch ? (
          <Pressable
            onPress={onToggleSearch}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Close search' : 'Search saved properties'}
            style={({ pressed }) => [styles.iconBtn, searchOpen && styles.iconBtnOn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name={searchOpen ? 'close' : 'search'} size={19} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {searchOpen ? (
        <View style={styles.searchField}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput
            autoFocus
            value={keyword}
            onChangeText={onKeyword}
            placeholder="Search your saved properties"
            placeholderTextColor={colors.mutedLight}
            style={styles.searchInput}
            returnKeyType="search"
            numberOfLines={1}
          />
        </View>
      ) : null}
    </View>
  )
}

/** The mock's closing nudge. Sits under the list rather than replacing it. */
function ExploreCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.exploreCard}>
      <View style={styles.exploreIcon}>
        <Ionicons name="heart-outline" size={22} color={BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exploreTitle}>Love a property?</Text>
        <Text style={styles.exploreSub}>Save it to view later and compare with your other favorites.</Text>
      </View>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.exploreBtn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.exploreBtnText}>Explore</Text>
        <Ionicons name="arrow-forward" size={13} color={BRAND} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header:          { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: BRAND },
  headerTopRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerTitleWrap: { flex: 1 },
  headerTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  headerTitle:     { ...typography.screenTitle, color: colors.white },
  savedPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  savedPillText:   { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, color: colors.white },
  headerSub:       { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.82)', marginTop: 3 },
  iconBtn:         { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  iconBtnOn:       { backgroundColor: 'rgba(255,255,255,0.16)' },
  searchField:     { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 13, height: 42, marginTop: 12 },
  searchInput:     { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink, padding: 0, textAlignVertical: 'center' },

  // flexGrow/flexShrink pinned — an unpinned horizontal ScrollView in a column
  // gets stretched or squashed by its siblings (see the note in search.tsx).
  chipScroller: { flexGrow: 0, flexShrink: 0 },
  // paddingBottom is a shadow gutter: this ScrollView clips to its content box,
  // and without it `shadow.card` is sliced flat under every chip.
  chipsRow:     { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 9 },
  chip:         { paddingHorizontal: 15, height: 36, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  chipOn:       { backgroundColor: BRAND, borderColor: BRAND },
  chipText:     { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  chipTextOn:   { fontFamily: fonts.bold, color: '#fff' },

  center:     { paddingHorizontal: 28, paddingTop: 48, paddingBottom: 24, alignItems: 'center' },
  emptyIcon:  { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 2, textAlign: 'center' },
  emptySub:   { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  cta:        { marginTop: 18, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.sm, ...shadow.cta },
  ctaText:    { ...typography.button },

  exploreCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, marginHorizontal: 16, marginTop: 4, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  exploreIcon:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  exploreTitle: { ...typography.cardTitle },
  exploreSub:   { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, color: colors.muted, marginTop: 2 },
  exploreBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: BRAND },
  exploreBtnText: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, color: BRAND },

  selectionBar:   { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderLight, ...shadow.raised },
  selectAll:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllBox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  selectAllBoxOn: { backgroundColor: BRAND, borderColor: BRAND },
  selectAllText:  { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  selectedCount:  { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: BRAND },
  compareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, paddingHorizontal: 16, height: 40, borderRadius: radius.sm },
  compareBtnOff:  { backgroundColor: colors.mutedLight },
  compareBtnText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: '#fff' },
})
