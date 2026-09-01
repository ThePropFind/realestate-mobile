import { useCallback, useState } from 'react'
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { Text } from '../src/components/Text'
import { ListSkeleton } from '../src/components/Skeleton'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { propertyApi } from '../src/lib/api'
import { useAuthStore } from '../src/store/authStore'
import { colors, fonts, radius, shadow, typography } from '../src/theme'
import type { ListingStatus, PriceUnit, PropertyCard } from '../src/types'

const BRAND  = colors.brand
const ACCENT = colors.accent

const STATUS_STYLE: Record<ListingStatus, { bg: string; fg: string; label: string }> = {
  DRAFT:          { bg: '#f1f5f9', fg: '#64748b', label: 'Draft' },
  PENDING_REVIEW: { bg: '#fef3c7', fg: '#b45309', label: 'In review' },
  ACTIVE:         { bg: '#dcfce7', fg: '#15803d', label: 'Active' },
  EXPIRED:        { bg: '#f1f5f9', fg: '#64748b', label: 'Expired' },
  REJECTED:       { bg: '#fee2e2', fg: '#b91c1c', label: 'Rejected' },
  SOLD_RENTED:    { bg: '#e0e7ff', fg: '#4338ca', label: 'Sold / Rented' },
}

export default function MyListingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isLoggedIn, hydrated } = useAuthStore()

  const [items, setItems] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!hydrated) return // wait for session restore; identity change re-fires the focus effect
    if (!isLoggedIn) { setItems([]); setLoading(false); return }
    try {
      const { data } = await propertyApi.myListings(0, 50)
      setItems(data.content)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [hydrated, isLoggedIn])

  // Refresh on focus — a listing just posted from the wizard should appear on return.
  // No separate mount effect: it double-fetched on first focus (#30); useFocusEffect alone
  // covers mount, refocus, and the post-hydration re-run (load's identity changes).
  useFocusEffect(useCallback(() => { setLoading(true); load() }, [load]))

  const onRefresh = () => { setRefreshing(true); load() }

  if (!hydrated || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <ListSkeleton />
      </SafeAreaView>
    )
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="home-outline" size={44} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>Sign in to see your listings</Text>
          <Pressable onPress={() => router.push('/auth/login')} style={styles.cta}>
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="home-outline" size={44} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySub}>Post your first property to see it here.</Text>
          <Pressable onPress={() => router.push('/post')} style={styles.cta}>
            <Text style={styles.ctaText}>Post a property</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => router.back()} count={items.length} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 + insets.bottom }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        renderItem={({ item }) => (
          <ListingCard item={item} onPress={() => router.push({ pathname: '/properties/[id]', params: { id: item.id, ownerView: '1' } })} />
        )}
      />
    </SafeAreaView>
  )
}

function Header({ onBack, count }: { onBack: () => void; count?: number }) {
  return (
    // Solid colors.brand, NOT a diagonal gradient. The root layout paints the
    // status-bar band in colors.brand, so a gradient starting at brandDark met
    // it as a visibly different, darker green right under the clock — the same
    // trap app/post.tsx already documents. Every other pushed screen (compare,
    // bookings) is solid brand; this was the last gradient header.
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
      <Text style={styles.headerTitle}>My Listings{count != null ? ` (${count})` : ''}</Text>
      <View style={{ width: 22 }} />
    </View>
  )
}

function ListingCard({ item, onPress }: { item: PropertyCard; onPress: () => void }) {
  const st = STATUS_STYLE[item.status]
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.thumbWrap}>
        {item.primaryImageUrl ? (
          <Image source={{ uri: item.primaryImageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="image-outline" size={22} color={colors.mutedLight} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
            </View>
            {item.isFeatured ? (
              <View style={[styles.statusBadge, { backgroundColor: '#fff1ea' }]}>
                <Text style={[styles.statusText, { color: ACCENT }]}>Featured</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.localityName}, {item.cityName}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{formatPrice(item.price, item.priceUnit)}</Text>
          <Text style={styles.meta}>{item.viewsCount} views</Text>
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
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: BRAND },
  headerTitle:  { ...typography.navTitle, color: '#fff' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon:    { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:   { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 2 },
  emptySub:     { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  cta:          { marginTop: 18, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.sm, ...shadow.cta },
  ctaText:      { ...typography.button },

  card:         { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  thumbWrap:    { width: 110, height: 110, backgroundColor: colors.border },
  thumb:        { width: '100%', height: '100%' },
  thumbEmpty:   { alignItems: 'center', justifyContent: 'center' },
  badgeRow:     { flexDirection: 'row', gap: 6, marginBottom: 4 },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  statusText:   { fontFamily: fonts.bold, fontSize: 10 },
  cardTitle:    { ...typography.cardTitle },
  cardSub:      { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price:        { fontFamily: fonts.extra, fontSize: 15, color: BRAND },
  meta:         { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
})
