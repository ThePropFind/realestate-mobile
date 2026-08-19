import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import { amenityIcon } from '../../lib/amenityIcons'
import type { Amenity } from '../../types'

/**
 * ⑤ Amenity grid — one distinct icon per amenity (see src/lib/amenityIcons.ts).
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
          <View style={styles.iconWrap}>
            <Ionicons name={amenityIcon(a.iconKey)} size={17} color={colors.brand} />
          </View>
          <Text style={styles.label} numberOfLines={2}>{a.name}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg, columnGap: spacing.sm },
  item: { width: '31.6%', alignItems: 'center' },
  iconWrap: {
    width: 42, height: 42, borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.medium, fontSize: 11, lineHeight: 15,
    color: colors.muted, textAlign: 'center',
  },
})
