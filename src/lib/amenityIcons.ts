import type { Ionicons } from '@expo/vector-icons'
import type { LandmarkKind } from '../types'

type IconName = keyof typeof Ionicons.glyphMap

/**
 * One distinct icon per amenity, keyed on the backend's `icon_key` column.
 *
 * The detail page previously drew the same checkmark next to all 23 amenities,
 * which made the grid a list of words — nothing was scannable. Keys come from the
 * amenities table (V2 seed + V14 + V18), so a new amenity row that lands here without a
 * mapping falls through to FALLBACK rather than rendering blank.
 */
const AMENITY_ICONS: Record<string, IconName> = {
  // utilities
  water:         'water-outline',
  parking:       'car-outline',
  drainage:      'funnel-outline',
  elevator:      'swap-vertical-outline',
  gas:           'bonfire-outline',
  'power-backup':'flash-outline',
  rainwater:     'rainy-outline',
  solar:         'sunny-outline',
  vastu:         'compass-outline',
  wifi:          'wifi-outline',
  // security & safety
  cctv:          'videocam-outline',
  gate:          'shield-checkmark-outline',
  guard:         'person-outline',
  fire:          'flame-outline',
  intercom:      'call-outline',
  // recreation
  basketball:    'basketball-outline',
  'play-area':   'happy-outline',
  'club-house':  'business-outline',
  garden:        'leaf-outline',
  gym:           'barbell-outline',
  jogging:       'walk-outline',
  // Ionicons has no pool glyph. The filled droplet reads as a body of water
  // against the outline one used for water supply — the pair stays distinguishable.
  'swimming-pool':'water',
  tennis:        'tennisball-outline',
  // land & farm (V18) — shown only on plot / agricultural listings
  'farm-house':      'home-outline',
  'storage-shed':    'cube-outline',
  'drip-irrigation': 'rainy-outline',
  'farm-road':       'trail-sign-outline',
  'cattle-shed':     'paw-outline',
  'water-tank':      'beaker-outline',
}

const FALLBACK: IconName = 'checkmark-circle-outline'

export function amenityIcon(iconKey: string | null | undefined): IconName {
  if (!iconKey) return FALLBACK
  return AMENITY_ICONS[iconKey] ?? FALLBACK
}

/**
 * Icon for a curated nearby landmark. Moved here from the deleted
 * src/lib/landmarks.ts — the data now comes from the server (B3), so only the
 * icon mapping stayed client-side, and the kinds are the backend's uppercase enum.
 */
export function landmarkIcon(kind: LandmarkKind): IconName {
  switch (kind) {
    case 'HOSPITAL':  return 'medkit-outline'
    case 'SCHOOL':    return 'school-outline'
    case 'MALL':      return 'bag-handle-outline'
    case 'TRANSPORT': return 'bus-outline'
    case 'FOOD':      return 'restaurant-outline'
    case 'PARK':      return 'leaf-outline'
    case 'TECH':      return 'business-outline'
    default:          return 'location-outline'
  }
}
