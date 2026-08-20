import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { Text } from '../../src/components/Text'
import { ListSkeleton } from '../../src/components/Skeleton'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { bookingsApi } from '../../src/lib/api'
import { ConfirmSheet } from '../../src/components/ConfirmSheet'
import { appAlert } from '../../src/components/AppAlert'
import { useAuthStore } from '../../src/store/authStore'
import { colors, fonts, radius, shadow } from '../../src/theme'
import type { BookingStatus, SiteVisitBooking } from '../../src/types'

const BRAND  = colors.brand
const ACCENT = colors.accent

const STATUS_STYLE: Record<BookingStatus, { bg: string; fg: string; label: string }> = {
  REQUESTED: { bg: '#fff7ed', fg: '#c2410c', label: 'Requested' },
  CONFIRMED: { bg: '#eff6ff', fg: '#1d4ed8', label: 'Confirmed' },
  COMPLETED: { bg: '#ecfdf5', fg: '#15803d', label: 'Completed' },
  CANCELLED: { bg: '#f1f5f9', fg: '#64748b', label: 'Cancelled' },
}

export default function BookingsScreen() {
  const router = useRouter()
  const { isLoggedIn, hydrated } = useAuthStore()

  const [items, setItems] = useState<SiteVisitBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<SiteVisitBooking | null>(null)

  const load = useCallback(async () => {
    if (!hydrated) return // wait for session restore; identity change re-fires the focus effect
    if (!isLoggedIn) { setItems([]); setLoading(false); return }
    try {
      const { data } = await bookingsApi.listMine(0, 50)
      setItems(data.content)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [hydrated, isLoggedIn])

  // Re-fetch on focus — a booking can be made from the detail screen.
  // No separate mount effect: it double-fetched on first focus (#30); useFocusEffect alone
  // covers mount, refocus, and the post-hydration re-run (load's identity changes).
  useFocusEffect(useCallback(() => { setLoading(true); load() }, [load]))

  const onRefresh = () => { setRefreshing(true); load() }

  const doCancel = async (b: SiteVisitBooking) => {
    setCancelling(b.id)
    // Optimistic — flip to CANCELLED locally.
    setItems((prev) => prev.map((x) =>
      x.id === b.id ? { ...x, status: 'CANCELLED', cancelledBy: 'BUYER' } : x))
    try {
      await bookingsApi.cancel(b.id)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not cancel'
      appAlert('Cancel failed', msg)
      load() // reconcile with server state
    } finally {
      setCancelling(null)
    }
  }

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
          <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={44} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>Sign in to see your bookings</Text>
          <Text style={styles.emptySub}>Site visits you request will show up here.</Text>
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
          <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={44} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>No site visits booked yet</Text>
          <Text style={styles.emptySub}>Tap “Book Visit” on any listing to request one.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <Header count={items.length} />
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        renderItem={({ item }) => (
          <BookingCard
            item={item}
            cancelling={cancelling === item.id}
            onPress={() => router.push(`/properties/${item.propertyId}`)}
            onCancel={() => setCancelTarget(item)}
          />
        )}
      />

      <ConfirmSheet
        visible={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        icon="calendar-outline"
        title="Cancel site visit?"
        body={cancelTarget ? `Cancel your visit request for "${cancelTarget.propertyTitle}"?` : undefined}
        confirmLabel="Cancel visit"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => { if (cancelTarget) doCancel(cancelTarget) }}
      />
    </SafeAreaView>
  )
}

function Header({ count }: { count?: number }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.headerTitle}>My Bookings</Text>
      {count != null && <Text style={styles.headerCount}>{count} {count === 1 ? 'visit' : 'visits'}</Text>}
    </View>
  )
}

function BookingCard({
  item, cancelling, onPress, onCancel,
}: {
  item: SiteVisitBooking; cancelling: boolean; onPress: () => void; onCancel: () => void
}) {
  const s = STATUS_STYLE[item.status]
  const canCancel = item.status === 'REQUESTED' || item.status === 'CONFIRMED'
  const slot = [item.preferredDate, item.preferredWindow].filter(Boolean).join(' · ')

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress} style={styles.cardTop}>
        <View style={styles.thumbWrap}>
          {item.propertyImageUrl ? (
            <Image source={{ uri: item.propertyImageUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Ionicons name="image-outline" size={22} color={colors.mutedLight} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.propertyTitle}</Text>
              <View style={[styles.pill, { backgroundColor: s.bg }]}>
                <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
              </View>
            </View>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.propertyLocality}, {item.propertyCity}
            </Text>
          </View>
          <View style={styles.slotRow}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={styles.slot}>{slot || 'Flexible slot'}</Text>
          </View>
        </View>
      </Pressable>

      {canCancel ? (
        <Pressable onPress={onCancel} disabled={cancelling} style={styles.cancelBtn}>
          {cancelling
            ? <ActivityIndicator size="small" color={colors.danger} />
            : <>
                <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
                <Text style={styles.cancelText}>Cancel visit</Text>
              </>}
        </Pressable>
      ) : item.cancelReason ? (
        <View style={styles.reasonRow}>
          <Text style={styles.reasonText} numberOfLines={2}>Reason: {item.cancelReason}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.brand },
  headerTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.white },
  headerCount: { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon:   { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:  { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 2 },
  emptySub:    { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  cta:         { marginTop: 18, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.sm, ...shadow.cta },
  ctaText:     { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },

  card:        { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  cardTop:     { flexDirection: 'row' },
  thumbWrap:   { width: 104, height: 104, backgroundColor: colors.border },
  thumb:       { width: '100%', height: '100%' },
  thumbEmpty:  { alignItems: 'center', justifyContent: 'center' },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:   { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  cardSub:     { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 },
  slotRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slot:        { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },

  pill:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText:    { fontFamily: fonts.bold, fontSize: 10 },

  cancelBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  cancelText:  { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger },
  reasonRow:   { paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.bg },
  reasonText:  { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
})
