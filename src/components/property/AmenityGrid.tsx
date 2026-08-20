import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, spacing } from '../../theme'
import { amenityIcon } from '../../lib/amenityIcons'
import type { Amenity } from '../../types'

/**
 * ⑤ Amenity grid — 4 across, one distinct icon per amenity (see
 * src/lib/amenityIcons.ts). Every amenity renders: capping the list at N and
 * hiding the rest tells a buyer the flat has fewer features than it does.
 *
 * `hideParking` drops the Car Parking row when the spec strip already shows a
 * parking figure. The amenity itself stays in the DB — join rows exist and search
 * filters read it — it is only this one view that would otherwise say parking twice.
 */
export function AmenityGrid({
  amenities, hideParking = false,
}: {
  amenities: Amenity[]
  hideParking?: boolean
}) {
  const shown = hideParking ? amenities.filter((a) => a.iconKey !== 'parking') : amenities
  if (!shown.length) return null

  return (
    <View style={styles.grid}>
      {shown.map((a) => (
        <View key={a.id} style={styles.item}>
          <Ionicons name={amenityIcon(a.iconKey)} size={22} color={colors.brand} />
          <Text style={styles.label} numberOfLines={2}>{a.name}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  // Gutters come from each item's own padding, never columnGap: mixing a gap with
  // a 25% width drops the row to 3 across on some Android densities.
  item: { width: '25%', paddingHorizontal: 2, alignItems: 'center' },
  label: {
    fontFamily: fonts.medium, fontSize: 10, lineHeight: 13,
    color: colors.muted, textAlign: 'center',
    marginTop: 6, minHeight: 26,
  },
})
