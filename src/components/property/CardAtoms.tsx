import { StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius } from '../../theme'
import type { PropertyCard } from '../../types'

/**
 * The listing-card design system.
 *
 * Every card in the app draws the same five things — title, location, price,
 * chips, spec strip — and they had drifted into five different treatments: the
 * home hero used ExtraBold 18 titles and a stacked icon-over-label spec block,
 * the rail card put the price ABOVE the title with no pin icon at all, and the
 * recent row printed "1200 sqft" as loose right-aligned text. Same information,
 * five vocabularies.
 *
 * These atoms are that vocabulary, written once. Cards stay free to compose them
 * differently — that is what keeps a hero card a hero card and a rail card a rail
 * card — but nothing re-picks a font size or a chip radius on its own any more.
 *
 * ONE RECIPE, THREE SIZES:
 *   lg — the home Featured hero card. One step up, not a different language.
 *   md — full-width cards: the home Recent row, and PropertyResultCard
 *        (Search / Saved / seller profile).
 *   sm — the compact rail card (Recommended For You, Similar Properties).
 *
 * `md` is transcribed from PropertyResultCard, which is the card the rest of the
 * app was tuned against. That component deliberately still carries its own copy
 * of these values rather than importing them — changing it would have re-rendered
 * three settled screens — so if you change `md` here, change it there too.
 */
export type CardSize = 'lg' | 'md' | 'sm'

interface Scale {
  title:     { fontSize: number; lineHeight: number }
  locIcon:   number
  loc:       { fontSize: number; lineHeight: number }
  price:     { fontSize: number; lineHeight: number }
  chipIcon:  number
  chip:      { fontSize: number; lineHeight: number }
  chipPadH:  number
  chipPadV:  number
  specIcon:  number
  spec:      { fontSize: number; lineHeight: number }
  specDivH:  number
  gap:       number
}

// Explicit lineHeight everywhere: includeFontPadding is off app-wide, so tall
// ascenders clip in a fixed row without it (see AGENTS.md).
export const CARD_SCALE: Record<CardSize, Scale> = {
  lg: {
    title: { fontSize: 17,   lineHeight: 23 }, locIcon: 13, loc: { fontSize: 12,   lineHeight: 16 },
    price: { fontSize: 20,   lineHeight: 26 }, chipIcon: 13, chip: { fontSize: 11,  lineHeight: 15 },
    // The spec strip does NOT take the lg step: on the hero card it shares a row
    // with the price, and at 12pt the two collide on a 320pt-wide phone. The lg
    // step shows in the title, price and chips instead.
    chipPadH: 9, chipPadV: 5, specIcon: 14, spec: { fontSize: 11.5, lineHeight: 16 }, specDivH: 15, gap: 6,
  },
  md: {
    title: { fontSize: 15,   lineHeight: 20 }, locIcon: 12, loc: { fontSize: 11,   lineHeight: 15 },
    price: { fontSize: 18,   lineHeight: 24 }, chipIcon: 12, chip: { fontSize: 10,  lineHeight: 13 },
    chipPadH: 7, chipPadV: 4, specIcon: 14, spec: { fontSize: 11, lineHeight: 15 }, specDivH: 14, gap: 5,
  },
  sm: {
    title: { fontSize: 12.5, lineHeight: 17 }, locIcon: 11, loc: { fontSize: 10.5, lineHeight: 14 },
    price: { fontSize: 15,   lineHeight: 20 }, chipIcon: 11, chip: { fontSize: 9.5, lineHeight: 12 },
    chipPadH: 6, chipPadV: 3, specIcon: 12, spec: { fontSize: 10, lineHeight: 14 }, specDivH: 12, gap: 3,
  },
}

type IconName = React.ComponentProps<typeof Ionicons>['name']

/** The listing's headline. Bold at every size — weight is not what changes. */
export function CardTitle({ size, children, lines = 1 }: { size: CardSize; children: string; lines?: number }) {
  const s = CARD_SCALE[size]
  return (
    <Text numberOfLines={lines} style={[styles.title, s.title]}>{children}</Text>
  )
}

/** Pin icon + "Locality, City". The icon is not optional — it is how a reader
 *  tells this line apart from the title above it at a glance. */
export function CardLocation({ size, item, showCity = true }: { size: CardSize; item: PropertyCard; showCity?: boolean }) {
  const s = CARD_SCALE[size]
  return (
    <View style={styles.row}>
      <Ionicons name="location" size={s.locIcon} color={colors.muted} />
      <Text numberOfLines={1} style={[styles.loc, s.loc]}>
        {showCity ? `${item.localityName}, ${item.cityName}` : item.localityName}
      </Text>
    </View>
  )
}

/** The price, in the one weight the app reserves for it. */
export function CardPrice({ size, children }: { size: CardSize; children: string }) {
  const s = CARD_SCALE[size]
  return <Text numberOfLines={1} style={[styles.price, s.price]}>{children}</Text>
}

/** A pale-sage fact pill — "Verified", "Apartment". */
export function CardChip({ size, icon, label }: { size: CardSize; icon: IconName; label: string }) {
  const s = CARD_SCALE[size]
  return (
    <View style={[styles.chip, { paddingHorizontal: s.chipPadH, paddingVertical: s.chipPadV }]}>
      <Ionicons name={icon} size={s.chipIcon} color={colors.brand} />
      <Text numberOfLines={1} style={[styles.chipText, s.chip]}>{label}</Text>
    </View>
  )
}

/** The specs a card shows, in the app's fixed order: beds, area, baths. */
export function listingSpecs(item: PropertyCard, opts?: { baths?: boolean }): { icon: IconName; label: string }[] {
  const specs: { icon: IconName; label: string }[] = []
  if (item.bedrooms)  specs.push({ icon: 'bed-outline',   label: `${item.bedrooms} BHK` })
  if (item.areaSqft)  specs.push({ icon: 'scan-outline',  label: `${item.areaSqft} sq.ft` })
  if (opts?.baths !== false && item.bathrooms) specs.push({ icon: 'water-outline', label: String(item.bathrooms) })
  return specs
}

/** Inline spec strip, hairline-divided. Never stacked icon-over-label — that
 *  variant only ever existed on the home hero and read as a different app. */
export function CardSpecs({ size, specs, style }: { size: CardSize; specs: { icon: IconName; label: string }[]; style?: StyleProp<ViewStyle> }) {
  const s = CARD_SCALE[size]
  if (!specs.length) return null
  return (
    <View style={[styles.row, style]}>
      {specs.map((spec, i) => (
        <View key={spec.label} style={styles.specCell}>
          {i > 0 ? <View style={[styles.specDivider, { height: s.specDivH }]} /> : null}
          <Ionicons name={spec.icon} size={s.specIcon} color={colors.muted} />
          <Text numberOfLines={1} style={[styles.spec, s.spec]}>{spec.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  title:      { fontFamily: fonts.bold, color: colors.ink },
  loc:        { fontFamily: fonts.regular, color: colors.muted, flexShrink: 1 },
  price:      { fontFamily: fonts.extra, color: colors.brand, flexShrink: 1 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brandTint, borderRadius: 7 },
  chipText:   { fontFamily: fonts.medium, color: colors.brand },
  specCell:   { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  specDivider:{ width: 1, backgroundColor: colors.border, marginHorizontal: 7 },
  spec:       { fontFamily: fonts.medium, color: colors.ink },
})
