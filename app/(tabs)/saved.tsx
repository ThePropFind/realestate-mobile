import { useCallback, useState } from 'react'
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { Text } from '../../src/components/Text'
import { ListSkeleton } from '../../src/components/Skeleton'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { favoritesApi } from '../../src/lib/api'
import { useAuthStore } from '../../src/store/authStore'
import { colors, fonts, radius, shadow } from '../../src/theme'
import type { PropertyCard } from '../../src/types'

const BRAND  = colors.brand
const ACCENT = colors.accent

export default function SavedScreen() {
  const router = useRouter()
  const { isLoggedIn, hydrated } = useAuthStore()

  const [items, setItems] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!hydrated) return // wait for session restore; identity change re-fires the focus effect
    if (!isLoggedIn) { setItems([]); setLoading(false); return }
    try {
      const { data } = await favoritesApi.listMine(0, 50)
      setItems(data.content)
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

  if (!hydrated || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header />
        <ListSkeleton />
      </SafeAreaView>
    )
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="heart-outline" size={44} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>Sign in to see saved properties</Text>
          <Text style={styles.emptySub}>Save listings you like and find them all in one place.</Text>
          <Pressable onPress={() => router.push('/auth/login')} style={styles.cta}>
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="heart-outline" size={44} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>No saved properties yet</Text>
          <Text style={styles.emptySub}>Tap the heart on any listing to save it for later.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <Header count={items.length} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        renderItem={({ item }) => (
          <SavedCard item={item} onPress={() => router.push(`/properties/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  )
}

function Header({ count }: { count?: number }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.headerTitle}>Saved Properties</Text>
      {count != null && <Text style={styles.headerCount}>{count} saved</Text>}
    </View>
  )
}

function SavedCard({ item, onPress }: { item: PropertyCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.thumbWrap}>
        {item.primaryImageUrl ? (
          <Image source={{ uri: item.primaryImageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="image-outline" size={22} color="#94a3b8" />
          </View>
        )}
      </View>
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {item.localityName}, {item.cityName}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{formatPrice(item.price, item.priceUnit)}</Text>
          <Text style={styles.meta}>
            {item.bedrooms != null ? `${item.bedrooms} BHK · ` : ''}{item.areaSqft} sqft
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

function formatPrice(price: number, unit: string): string {
  if (unit === 'PER_MONTH') return `₹${price.toLocaleString('en-IN')}/mo`
  if (unit === 'PER_SQFT')  return `₹${price.toLocaleString('en-IN')}/sqft`
  if (price >= 10_000_000)  return `₹${(price / 10_000_000).toFixed(2)} Cr`
  if (price >= 100_000)     return `₹${(price / 100_000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.brand },
  headerTitle:  { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.white },
  headerCount:  { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon:    { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:   { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 2 },
  emptySub:     { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  cta:          { marginTop: 18, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.sm, ...shadow.cta },
  ctaText:      { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },

  card:         { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  thumbWrap:    { width: 110, height: 104, backgroundColor: colors.border },
  thumb:        { width: '100%', height: '100%' },
  thumbEmpty:   { alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  cardSub:      { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price:        { fontFamily: fonts.extra, fontSize: 15, color: BRAND },
  meta:         { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
})
