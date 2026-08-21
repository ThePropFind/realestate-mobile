import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, fonts, radius } from '../theme'

export type TileOption<T extends string = string> = {
  label: string
  value: T
  icon: React.ComponentProps<typeof Ionicons>['name']
}

/**
 * Icon + label card used by the filter screen's Property Type, Furnishing and
 * Posted By groups.
 *
 * Laid out as a wrapping row of fixed-fraction tiles rather than a FlatList grid
 * so a group of 3 and a group of 6 line up on the same column rhythm.
 */
export function OptionTileGroup<T extends string = string>({
  options, values, onToggle, columns = 3,
}: {
  options: TileOption<T>[]
  values: T[]
  onToggle: (v: T) => void
  columns?: number
}) {
  return (
    <View style={styles.grid}>
      {options.map((opt) => {
        const selected = values.includes(opt.value)
        return (
          <Pressable
            key={opt.value}
            onPress={() => onToggle(opt.value)}
            style={({ pressed }) => [
              styles.tile,
              { width: `${100 / columns}%` },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.inner, selected && styles.innerOn]}>
              <Ionicons
                name={opt.icon}
                size={22}
                color={selected ? colors.brand : colors.muted}
              />
              {/* Explicit lineHeight: the shared Text wrapper disables
                  includeFontPadding, so two-line labels need it to stay centred. */}
              <Text
                style={[styles.label, selected && styles.labelOn]}
                numberOfLines={2}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid:     { flexDirection: 'row', flexWrap: 'wrap' },
  // Padding on the outer tile, border on the inner box — keeps the gap even
  // without negative margins fighting the parent's padding.
  tile:     { padding: 5 },
  inner: {
    alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 16, paddingHorizontal: 8, minHeight: 86,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.white,
  },
  innerOn:  { borderColor: colors.brand, borderWidth: 1.5, backgroundColor: colors.brandTint },
  label:    { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, textAlign: 'center' },
  labelOn:  { fontFamily: fonts.bold, color: colors.brand },
})
