import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import {
  SQFT_PER_CENT, approvalShort, parkingLabel, prettyEnum,
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
    key: 'area', icon: 'resize-outline', label: 'Built-up', value: `${fmtNum(data.areaSqft)} sq.ft`,
  }
  const parking: SpecCell = {
    key: 'parking', icon: 'car-outline', label: 'Parking',
    value: parkingLabel(data.parkingCount, data.parkingAvailable),
  }
  const propertyType: SpecCell = {
    key: 'propertyType', icon: 'home-outline', label: 'Type', value: prettyEnum(t),
  }

  if (t === 'PLOT') {
    const cents = data.plotAreaCents ?? data.areaSqft / SQFT_PER_CENT
    return [
      { key: 'area', icon: 'resize-outline', label: 'Plot Area', value: `${cents.toFixed(1)} cents` },
      {
        key: 'dimensions', icon: 'scan-outline', label: 'Dimensions',
        value: data.plotLengthFt && data.plotBreadthFt
          ? `${fmtNum(data.plotLengthFt)}×${fmtNum(data.plotBreadthFt)} ft`
          : '—',
      },
      { ...sqft, label: 'Area' },
      { key: 'approval', icon: 'document-text-outline', label: 'Approval', value: approvalShort(data.approvalAuthority) },
      { key: 'facing', icon: 'compass-outline', label: 'Facing', value: data.facing || '—' },
    ]
  }

  if (t === 'AGRICULTURAL_LAND') {
    const cents = data.plotAreaCents ?? data.areaSqft / SQFT_PER_CENT
    const acres = cents / 100
    return [
      {
        key: 'area', icon: 'resize-outline', label: 'Land Area',
        value: acres >= 1 ? `${acres.toFixed(2)} acres` : `${cents.toFixed(1)} cents`,
      },
      { key: 'water', icon: 'water-outline', label: 'Water', value: data.waterSource ? prettyEnum(data.waterSource) : '—' },
      { key: 'soil', icon: 'leaf-outline', label: 'Soil', value: data.soilType ? prettyEnum(data.soilType) : '—' },
      { ...sqft, label: 'Area' },
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
          ? `${data.floorNumber}${data.totalFloors != null ? ` of ${data.totalFloors}` : ''}`
          : '—',
      },
      { key: 'furnishing', icon: 'cube-outline', label: 'Furnishing', value: prettyEnum(data.furnishing) },
      propertyType,
      parking,
    ]
  }

  // Residential / PG
  return [
    {
      key: 'bedrooms', icon: 'bed-outline', label: 'Bedrooms',
      value: data.bedrooms != null ? `${data.bedrooms} BHK` : 'PG',
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
 * Laid out as a wrap grid of 3 per row (5 cells = 3 + 2) rather than a horizontal
 * scroll: a scrolling strip hides cells behind a gesture nobody knows is there, and
 * these five facts are the ones a buyer scans before deciding to keep reading.
 */
export function KeySpecStrip({ data }: { data: PropertyDetail }) {
  const cells = keySpecCells(data)
  return (
    <View style={styles.grid}>
      {cells.map((c) => (
        <View key={c.key} style={styles.cell}>
          <View style={styles.iconWrap}>
            <Ionicons name={c.icon} size={16} color={colors.brand} />
          </View>
          <Text style={styles.value} numberOfLines={1}>{c.value}</Text>
          <Text style={styles.label} numberOfLines={1}>{c.label}</Text>
        </View>
      ))}
    </View>
  )
}

/** 1938 → "1,938"; 30.5 → "30.5". Areas are decimals in the DTO but usually whole. */
function fmtNum(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-IN') : `${n}`
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    // 3 per row, accounting for the two 8px gaps between them.
    width: '31.6%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  // Playfair in a stat slot; explicit lineHeight because the cell is fixed-height.
  value: { fontFamily: fonts.displaySemi, fontSize: 14, lineHeight: 19, color: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.muted, marginTop: 1 },
})
