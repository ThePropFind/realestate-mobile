import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import type { Ionicons } from '@expo/vector-icons'
import { bookingsApi, propertyApi } from './api'
import { useAuthStore } from '../store/authStore'

// ponytail: no notifications backend yet — this derives a feed client-side from
// the user's bookings + listing statuses. Replace with a real /notifications
// endpoint (+ unread tracking + push) when expo-notifications lands (backlog).
//
// Lives here rather than inside NotificationsSheet so the header bells can show
// a count without opening the sheet. `href` (not an onPress closure) keeps the
// builder free of router/sheet state.

export interface Notice {
  id: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  body: string
  at: string // ISO — used for sorting + the time label
  href: string
}

const MAX_NOTICES = 12

/** Newest-first feed, capped. Returns [] when the user is signed out. */
export async function fetchNotices(): Promise<Notice[]> {
  if (!useAuthStore.getState().isLoggedIn) return []

  const notices: Notice[] = []
  const [bookings, listings] = await Promise.allSettled([
    bookingsApi.listMine(0, 20),
    propertyApi.myListings(0, 20),
  ])

  if (bookings.status === 'fulfilled') {
    for (const b of bookings.value.data.content) {
      if (b.status === 'CONFIRMED') notices.push({
        id: `b-${b.id}`, icon: 'calendar', at: b.updatedAt,
        title: 'Site visit confirmed',
        body: `${b.propertyTitle} — ${[b.preferredDate, b.preferredWindow].filter(Boolean).join(' · ') || 'owner will coordinate the slot'}`,
        href: `/properties/${b.propertyId}`,
      })
      if (b.status === 'CANCELLED' && b.cancelledBy === 'OWNER') notices.push({
        id: `b-${b.id}`, icon: 'calendar-clear-outline', at: b.updatedAt,
        title: 'Site visit cancelled by owner',
        body: b.propertyTitle,
        href: `/properties/${b.propertyId}`,
      })
    }
  }

  if (listings.status === 'fulfilled') {
    for (const p of listings.value.data.content) {
      if (p.status === 'ACTIVE') notices.push({
        id: `l-${p.id}`, icon: 'checkmark-circle', at: p.createdAt,
        title: 'Your listing is live',
        body: p.title,
        href: `/properties/${p.id}?ownerView=1`,
      })
      if (p.status === 'REJECTED') notices.push({
        id: `l-${p.id}`, icon: 'alert-circle-outline', at: p.createdAt,
        title: 'Listing needs changes',
        body: `${p.title} — open it to see the review notes`,
        href: `/properties/${p.id}?ownerView=1`,
      })
      if (p.status === 'PENDING_REVIEW') notices.push({
        id: `l-${p.id}`, icon: 'time-outline', at: p.createdAt,
        title: 'Listing under review',
        body: p.title,
        href: `/properties/${p.id}?ownerView=1`,
      })
    }
  }

  notices.sort((a, b) => b.at.localeCompare(a.at))
  return notices.slice(0, MAX_NOTICES)
}

/**
 * Badge count for the header bell. This is a *total*, not an unread count —
 * there is no read tracking server-side yet, so it stops changing only when the
 * underlying bookings/listings do.
 */
export function useNoticeCount(): number {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const [count, setCount] = useState(0)

  useFocusEffect(useCallback(() => {
    if (!isLoggedIn) { setCount(0); return }
    let mounted = true
    ;(async () => {
      try {
        const notices = await fetchNotices()
        if (mounted) setCount(notices.length)
      } catch { /* bell just stays bare */ }
    })()
    return () => { mounted = false }
  }, [isLoggedIn]))

  return count
}
