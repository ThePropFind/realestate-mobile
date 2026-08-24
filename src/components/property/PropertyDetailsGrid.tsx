import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import {
  SQFT_PER_CENT, approvalShort, listingTypeLabel, parkingLabel,
  possessionLabel, prettyEnum,
} from '../../lib/format'
import { keySpecCells } from './KeySpecStrip'
import type { PreferredTenant, PropertyDetail } from '../../types'

type IconName = keyof typeof Ionicons.glyphMap
type Row = { key: string; icon: IconName; label: string; value: string }

const TENANT_LABELS: Record<PreferredTenant, string> = {
  FAMILY: 'Family', BACHELOR_MEN: 'Bachelors (Men)',
  BACHELOR_WOMEN: 'Bachelors (Women)', ANYONE: 'Anyone',
}

/**
 * ⑧ Property details — a 2-column key/value grid.
 *
 * This is the old FeatureRows with its per-type branch logic kept intact (PLOT and
 * AGRICULTURAL_LAND listings need entirely different facts) and only its
 * presentation changed. Rows the spec strip already showed are filtered out by
 * shared SpecKey, so nothing appears twice on the same screen.
 */
export function PropertyDetailsGrid({ data }: { data: PropertyDetail }) {
  const covered = new Set<string>(keySpecCells(data).map((c) => c.key))
  const rows = rowsFor(data).filter((r) => !covered.has(r.key))
  if (!rows.length) return null

  return (
    <View style={styles.grid}>
      {rows.map((r) => (
        <View key={r.key} style={styles.cell}>
          <View style={styles.iconBox}>
            {/* Brand, not muted — muted grey all but disappears against the
                colors.bg fill behind it. */}
            <Ionicons name={r.icon} size={15} color={colors.brand} />
          </View>
          <View style={styles.text}>
            <Text style={styles.label} numberOfLines={1}>{r.label}</Text>
            <Text style={styles.value} numberOfLines={2}>{r.value}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function rowsFor(data: PropertyDetail): Row[] {
  const t = data.propertyType
  const rows: Row[] = []
  const push = (key: string, icon: IconName, label: string, value: string | null | undefined) => {
    if (value != null && value !== '') rows.push({ key, icon, label, value })
  }

  // Shown for every property type — the mockup's Property ID line and the
  // facts a buyer quotes back on the phone.
  push('referenceCode', 'pricetag-outline', 'Property ID', data.referenceCode)
  push('listingType',   'swap-horizontal-outline', 'Listing', listingTypeLabel(data.listingType))

  if (t === 'PLOT') {
    push('propertyType', 'home-outline',          'Type',          'Plot / Land')
    push('dimensions',   'scan-outline',          'Dimensions',
      data.plotLengthFt && data.plotBreadthFt ? `${data.plotLengthFt} × ${data.plotBreadthFt} ft` : null)
    push('plotArea',     'resize-outline',        'Plot Area', data.plotAreaCents != null ? `${data.plotAreaCents} cents` : null)
    push('roadWidth',    'trail-sign-outline',    'Road Width', data.roadWidthFt != null ? `${data.roadWidthFt} ft` : null)
    push('approval',     'document-text-outline', 'Approval',   data.approvalAuthority ? approvalShort(data.approvalAuthority) : null)
    push('boundaryWall', 'square-outline',        'Compound Wall', data.boundaryWall == null ? null : data.boundaryWall ? 'Built' : 'Not built')
    push('cornerPlot',   'git-branch-outline',    'Corner Plot',   data.cornerPlot == null ? null : data.cornerPlot ? 'Yes' : 'No')
    push('fenced',       'shield-outline',        'Fenced',        data.fenced == null ? null : data.fenced ? 'Yes' : 'No')
    // Water and power are the first two questions a plot buyer asks, and the
    // post wizard collects them for every land listing — not just farmland.
    push('water',        'water-outline',         'Water Source',  data.waterSource ? prettyEnum(data.waterSource) : null)
    push('hasWell',      'ellipse-outline',       'Open Well',     data.hasWell == null ? null : data.hasWell ? 'Yes' : 'No')
    push('power',        'flash-outline',         'Power',         data.electricService ? prettyEnum(data.electricService) : null)
    push('ownership',    'key-outline',           'Ownership',     data.ownershipType ? prettyEnum(data.ownershipType) : null)
    push('facing',       'compass-outline',       'Facing',        data.facing)
    return rows
  }

  if (t === 'AGRICULTURAL_LAND') {
    const cents = data.plotAreaCents ?? data.areaSqft / SQFT_PER_CENT
    push('propertyType', 'home-outline',    'Type',         'Agricultural Land')
    push('landArea',     'resize-outline',  'Area',         `${cents.toFixed(1)} cents (${(cents / 100).toFixed(2)} acres)`)
    push('soil',         'leaf-outline',    'Soil Type',    data.soilType ? prettyEnum(data.soilType) : null)
    push('water',        'water-outline',   'Water Source', data.waterSource ? prettyEnum(data.waterSource) : null)
    push('hasWell',      'ellipse-outline', 'Open Well',    data.hasWell == null ? null : data.hasWell ? 'Yes' : 'No')
    push('power',        'flash-outline',   'Power',        data.electricService ? prettyEnum(data.electricService) : null)
    push('crop',         'nutrition-outline', 'Current Crop', data.cropCurrentlyGrown)
    push('fenced',       'shield-outline',  'Fenced',       data.fenced == null ? null : data.fenced ? 'Yes' : 'No')
    push('ownership',    'key-outline',     'Ownership',    data.ownershipType ? prettyEnum(data.ownershipType) : null)
    push('facing',       'compass-outline', 'Facing',       data.facing)
    return rows
  }

  // Residential / commercial / PG
  push('propertyType', 'home-outline',          'Property Type', prettyEnum(t))
  push('bedrooms',     'bed-outline',           'Bedrooms',      data.bedrooms != null ? `${data.bedrooms}` : null)
  push('bathrooms',    'water-outline',         'Bathrooms',     data.bathrooms != null ? `${data.bathrooms}` : null)
  push('balconies',    'sunny-outline',         'Balconies',     data.balconies != null ? `${data.balconies}` : null)
  push('floor',        'layers-outline',        'Floor',
    data.floorNumber != null
      ? `${data.floorNumber}${data.totalFloors != null ? ` of ${data.totalFloors}` : ''}`
      : null)
  push('furnishing',   'cube-outline',          'Furnishing',    prettyEnum(data.furnishing))
  push('facing',       'compass-outline',       'Facing',        data.facing)
  push('possession',   'calendar-outline',      'Possession',    possessionLabel(data.possessionStatus))
  push('approval',     'document-text-outline', 'Approval',      data.approvalAuthority ? approvalShort(data.approvalAuthority) : null)
  push('age',          'time-outline',          'Age',
    data.ageOfProperty != null ? (data.ageOfProperty === 0 ? 'New' : `${data.ageOfProperty} yrs`) : null)
  push('parking',      'car-outline',           'Parking',       parkingLabel(data.parkingCount, data.parkingAvailable))
  push('carpetArea',   'resize-outline',        'Carpet Area',   data.carpetAreaSqft != null ? `${data.carpetAreaSqft} sq.ft` : null)
  push('ownership',    'key-outline',           'Ownership',     data.ownershipType ? prettyEnum(data.ownershipType) : null)
  push('availableFrom','calendar-clear-outline','Available From', data.availableFrom)
  if (data.listingType === 'RENT' || data.listingType === 'PG') {
    push('preferredTenant', 'people-outline', 'Preferred Tenant',
      data.preferredTenant ? TENANT_LABELS[data.preferredTenant] : null)
  }
  return rows
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  // 50% + inner padding, not 47% + columnGap: the percentage rounds badly against
  // a columnGap and can collapse the grid to a single column on some densities.
  cell: {
    width: '50%', flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingRight: spacing.sm,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  text:  { flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: colors.muted },
  value: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.ink },
})
