import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { DraggableSheet, SheetGrabZone } from './DraggableSheet'
import { fetchNotices, type Notice } from '../lib/notifications'
import { useAuthStore } from '../store/authStore'
import { colors, fonts, radius, typography } from '../theme'

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const [items, setItems] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible || !isLoggedIn) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const notices = await fetchNotices()
        if (mounted) setItems(notices)
      } catch { if (mounted) setItems([]) }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [visible, isLoggedIn])

  // Empty / signed-out / loading states render no ScrollView.
  const hasList = isLoggedIn && !loading && items.length > 0

  return (
    // The list is the only scrollable here, so when there is no list the whole sheet
    // can own the drag; otherwise the header does (see DraggableSheet's responder note).
    <DraggableSheet visible={visible} onClose={onClose} dragAnywhere={!hasList}>
      <SheetGrabZone>
        <Text style={styles.title}>Notifications</Text>
      </SheetGrabZone>

      {!isLoggedIn ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}><Ionicons name="notifications-outline" size={26} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>Sign in to see your updates</Text>
          <Text style={styles.emptyBody}>Site-visit confirmations and news about your listings show up here.</Text>
          <Pressable style={styles.signInBtn} onPress={() => { onClose(); router.push('/auth/login') }}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 28 }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}><Ionicons name="notifications-off-outline" size={26} color={colors.brand} /></View>
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptyBody}>Updates on your site visits and listings will appear here.</Text>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }} showsVerticalScrollIndicator={false}>
          {items.map((n) => (
            <Pressable key={n.id} onPress={() => { onClose(); router.push(n.href as never) }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
              <View style={styles.rowIcon}><Ionicons name={n.icon} size={18} color={colors.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                <Text style={styles.rowBody} numberOfLines={2}>{n.body}</Text>
              </View>
              <Text style={styles.rowTime}>{timeAgo(n.at)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  title:      { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 6, marginBottom: 12 },

  row:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  rowTitle:   { ...typography.label },
  rowBody:    { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  rowTime:    { fontFamily: fonts.medium, fontSize: 11, color: colors.mutedLight, marginTop: 2 },

  emptyWrap:  { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 12 },
  emptyIcon:  { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { ...typography.cardTitle },
  emptyBody:  { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  signInBtn:  { backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: 28, paddingVertical: 12, marginTop: 14 },
  signInText: { ...typography.button },
})
