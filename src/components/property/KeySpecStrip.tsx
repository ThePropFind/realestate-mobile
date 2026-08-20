import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, spacing } from '../../theme'
import {
  SQFT_PER_CENT, approvalShort, parkingSlots, prettyEnum,
} from '../../lib/format'
import type { PropertyDetail } from '../../types'

type IconName = keyof typeof Ionicons.glyphMap

/**
 * Canonical id for a fact about a listing.
 *
 * The strip and PropertyDetailsGrid both key their rows on these, so the grid can
 * drop whatever the strip already showed. Without a shared vocabulary the two
 * sections drift and a buyer sees "Bedrooms 3" twice on the same screen.
 */
export type SpecKey =
  | 'bedrooms' | 'bathrooms' | 'area' | 'propertyType' | 'parking'
  | 'dimensions' | 'approval' | 'facing' | 'water' | 'soil' | 'fenced'
  | 'floor' | 'furnishing'

export type SpecCell = { key: SpecKey; icon: IconName; label: string; value: string }

/**
 * Short forms for the strip only. A cell gives the value ~46dp; "Independent
 * House" needs ~119dp, so the full name would overflow into its neighbours and
 * make five equal cells look unequal. The unabbreviated name still appears in
 * PropertyDetailsGrid wherever the strip has not already covered that key.
 */
const SHORT_TYPE: Partial<Record<PropertyDetail['propertyType'], string>> = {
  APARTMENT:         'Flat',
  INDEPENDENT_HOUSE: 'House',
  BUILDER_FLOOR:     'Floor',
  COMMERCIAL_OFFICE: 'Office',
  COMMERCIAL_SHOP:   'Shop',
  PG_HOSTEL:         'PG',
  AGRICULTURAL_LAND: 'Land',
}

function shortType(t: PropertyDetail['propertyType']): string {
  return SHORT_TYPE[t] ?? prettyEnum(t)
}

/**
 * ③ The branch table. The mockup's 5-cell strip is the *residential* case; the app
 * also serves PLOT, AGRICULTURAL_LAND and COMMERCIAL, and each needs its own five
 * facts — sq.ft alone tells a farmland buyer nothing.
 *
 * Exported separately from the component so PropertyDetailsGrid can read `key` off
 * each cell and filter its own rows without rendering anything.
 */
export function keySpecCells(data: PropertyDetail): SpecCell[] {
  const t = data.propertyType
  const sqft: SpecCell = {
    key: 'area', icon: 'resize-outline', label: 'sq.ft', value: fmtNum(data.areaSqft),
  }
  const slots = parkingSlots(data.parkingCount, data.parkingAvailable)
  const parking: SpecCell = {
    key: 'parking', icon: 'car-outline', label: 'Car Parking',
    value: slots === 0 ? 'None' : `${slots}`,
  }
  const propertyType: SpecCell = {
    key: 'propertyType', icon: 'home-outline', label: 'Property Type', value: shortType(t),
  }

  if (t === 'PLOT') {
    const cents = data.plotAreaCents ?? data.areaSqft / SQFT_PER_CENT
    return [
      { key: 'area', icon: 'resize-outline', label: 'Cents', value: cents.toFixed(1) },
      {
        key: 'dimensions', icon: 'scan-outline', label: 'Dimensions (ft)',
        value: data.plotLengthFt && data.plotBreadthFt
          ? `${fmtNum(data.plotLengthFt)}×${fmtNum(data.plotBreadthFt)}`
          : '—',
      },
      sqft,
      { key: 'approval', icon: 'document-text-outline', label: 'Approval', value: approvalShort(data.approvalAuthority) },
      { key: 'facing', icon: 'compass-outline', label: 'Facing', value: data.facing || '—' },
    ]
  }

  if (t === 'AGRICULTURAL_LAND') {
    const cents = data.plotAreaCents ?? data.areaSqft / SQFT_PER_CENT
    const acres = cents / 100
    return [
      acres >= 1
        ? { key: 'area', icon: 'resize-outline', label: 'Acres', value: acres.toFixed(2) }
        : { key: 'area', icon: 'resize-outline', label: 'Cents', value: cents.toFixed(1) },
      { key: 'water', icon: 'water-outline', label: 'Water', value: data.waterSource ? prettyEnum(data.waterSource) : '—' },
      { key: 'soil', icon: 'leaf-outline', label: 'Soil', value: data.soilType ? prettyEnum(data.soilType) : '—' },
      sqft,
      {
        key: 'fenced', icon: 'shield-outline', label: 'Fenced',
        value: data.fenced == null ? '—' : data.fenced ? 'Yes' : 'No',
      },
    ]
  }

  if (t === 'COMMERCIAL_OFFICE' || t === 'COMMERCIAL_SHOP') {
    return [
      sqft,
      {
        key: 'floor', icon: 'layers-outline', label: 'Floor',
        value: data.floorNumber != null
          ? `${data.floorNumber}${data.totalFloors != null ? `/${data.totalFloors}` : ''}`
          : '—',
      },
      { key: 'furnishing', icon: 'cube-outline', label: 'Furnishing', value: furnishShort(data.furnishing) },
      propertyType,
      parking,
    ]
  }

  // Residential / PG
  return [
    {
      key: 'bedrooms', icon: 'bed-outline', label: 'BHK',
      value: data.bedrooms != null ? `${data.bedrooms}` : '—',
    },
    {
      key: 'bathrooms', icon: 'water-outline', label: 'Bathrooms',
      value: data.bathrooms != null ? `${data.bathrooms}` : '—',
    },
    sqft,
    propertyType,
    parking,
  ]
}

/**
 * One flat row of five, per the mockup: icon and value share a line, the unit sits
 * underneath as the label, and there are no dividers between cells.
 *
 * Not a scroll and not a wrap grid — a scrolling strip hides cells behind a gesture
 * nobody knows is there, and these five facts are the ones a buyer scans before
 * deciding to keep reading, so all five have to be visible at once.
 */
export function KeySpecStrip({ data }: { data: PropertyDetail }) {
  const cells = keySpecCells(data)
  return (
    <View style={styles.row}>
      {cells.map((c) => (
        <View key={c.key} style={styles.cell}>
          <View style={styles.top}>
            <Ionicons name={c.icon} size={15} color={colors.ink} />
            {/* No adjustsFontSizeToFit — on Android it is per-Text, so five cells
                would render at five different sizes. */}
            <Text style={styles.value} numberOfLines={1}>{c.value}</Text>
          </View>
          <Text style={styles.label} numberOfLines={1}>{c.label}</Text>
        </View>
      ))}
    </View>
  )
}

/** SEMI_FURNISHED → "Semi" — same ~46dp cell budget as SHORT_TYPE. */
function furnishShort(f: PropertyDetail['furnishing']): string {
  if (f === 'SEMI_FURNISHED')  return 'Semi'
  if (f === 'FULLY_FURNISHED') return 'Full'
  return 'None'
}

/** 1938 → "1,938"; 30.5 → "30.5". Areas are decimals in the DTO but usually whole. */
function fmtNum(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-IN') : `${n}`
}

const styles = StyleSheet.create({
  // Small negative bleed buys back the width the longest labels ("Property Type",
  // "Car Parking") need to sit on one line across five cells.
  row: { flexDirection: 'row', marginHorizontal: -spacing.sm },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 2 },
  // maxWidth + flexShrink on the value: without both, a long value lays out at its
  // natural width and spills over the neighbouring cells, so five equal-width
  // cells read as five different widths.
  top: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  // Value and label are split so the unit lives in the label ("1938" / "sq.ft"),
  // matching the mockup rather than cramming "1938 sq.ft" into one line.
  value: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink, flexShrink: 1 },
  label: {
    fontFamily: fonts.medium, fontSize: 10, lineHeight: 14,
    color: colors.muted, textAlign: 'center', marginTop: 3,
  },
})
