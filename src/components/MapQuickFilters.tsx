import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import { formatPricePill } from '../lib/format'
import { colors, fonts, radius, shadow } from '../theme'
import type { SearchFilters } from '../lib/searchFilters'
import type { ListingType } from '../types'

const BRAND = colors.brand

interface Props {
  filters: SearchFilters
  /** Buy / Rent write straight into filter state — they need no second screen. */
  onListingType: (t: ListingType) => void
  /** Price / Property Type hand off to the full filter modal. */
  onOpenFilters: () => void
}

/**
 * The mockup's shortcut strip under the card carousel.
 *
 * It is a shortcut, not a second filter model: Buy/Rent toggle
 * `filters.listingType` directly, and Price / Property Type open `/filters`,
 * which already owns budget bands and the type tiles. Both buttons show the
 * current selection as their label so the strip reports state instead of just
 * offering actions.
 */
export function MapQuickFilters({ filters, onListingType, onOpenFilters }: Props) {
  const priceLabel = budgetLabel(filters)
  const typeCount = filters.propertyTypes?.length ?? (filters.propertyType ? 1 : 0)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // The strip is one tap target per pill; nothing here should swallow a
      // drag meant for the map behind it.
      keyboardShouldPersistTaps="handled"
    >
      <Pill
        icon="home-outline"
        label="Buy"
        on={filters.listingType === 'SALE'}
        onPress={() => onListingType('SALE')}
      />
      <Pill
        icon="key-outline"
        label="Rent"
        on={filters.listingType === 'RENT'}
        onPress={() => onListingType('RENT')}
      />
      <Pill
        icon="cash-outline"
        label={priceLabel ?? 'Price'}
        on={priceLabel != null}
        chevron
        onPress={onOpenFilters}
      />
      <Pill
        icon="grid-outline"
        label={typeCount > 0 ? `${typeCount} Type${typeCount > 1 ? 's' : ''}` : 'Property Type'}
        on={typeCount > 0}
        chevron
        onPress={onOpenFilters}
      />
    </ScrollView>
  )
}

function Pill({ icon, label, on, chevron, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  on: boolean
  chevron?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={15} color={on ? '#fff' : colors.ink} />
      <Text style={[styles.pillText, on && styles.pillTextOn]} numberOfLines={1}>{label}</Text>
      {chevron ? (
        <Ionicons name="chevron-down" size={13} color={on ? '#fff' : colors.muted} />
      ) : null}
    </Pressable>
  )
}

/**
 * "₹20 L – ₹50 L" / "Under ₹50 L" / "Over ₹20 L", or null when no budget is set.
 * Rentals render per-month so the strip never labels ₹18,000 as a sale price.
 */
function budgetLabel(f: SearchFilters): string | null {
  const unit = f.listingType === 'RENT' ? 'PER_MONTH' : 'TOTAL'
  const lo = f.minPrice != null ? formatPricePill(f.minPrice, unit) : null
  const hi = f.maxPrice != null ? formatPricePill(f.maxPrice, unit) : null
  if (lo && hi) return `${lo} – ${hi}`
  if (hi) return `Under ${hi}`
  if (lo) return `Over ${lo}`
  return null
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 24, gap: 8, paddingVertical: 2 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: colors.white,
    ...shadow.raised,
  },
  pillOn:     { backgroundColor: BRAND },
  pillText:   { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  pillTextOn: { fontFamily: fonts.bold, color: '#fff' },
})
