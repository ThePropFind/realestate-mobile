import { memo, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { Marker } from 'react-native-maps'
import { formatPricePill } from '../lib/format'
import { colors, fonts } from '../theme'
import type { PropertyCard } from '../types'

const BRAND  = colors.brand
const ACCENT = colors.accent

interface Props {
  item: PropertyCard
  selected: boolean
  /** Changes when the map screen refocuses — forces a re-rasterise. */
  refresh: number
  onPress: (item: PropertyCard) => void
}

/**
 * Short label under the price — the mockup's "₹90 L / Villa" second line.
 * BHK wins over the property type where there is one, because "2BHK" tells a
 * buyer more than "Apartment" does; plots and commercial have no bedrooms and
 * fall through to a shortened type name.
 */
const TYPE_LABEL: Record<string, string> = {
  APARTMENT:         'Apartment',
  BUILDER_FLOOR:     'Builder Floor',
  INDEPENDENT_HOUSE: 'House',
  VILLA:             'Villa',
  PLOT:              'Plot',
  AGRICULTURAL_LAND: 'Agri Land',
  COMMERCIAL_OFFICE: 'Office',
  COMMERCIAL_SHOP:   'Shop',
  WAREHOUSE:         'Warehouse',
  PG_HOSTEL:         'PG',
}

function subLabel(item: PropertyCard): string {
  if (item.bedrooms != null && item.bedrooms > 0) return `${item.bedrooms}BHK`
  return TYPE_LABEL[item.propertyType] ?? 'Property'
}

/**
 * Custom price-pill map marker: a two-line ₹-bubble over a small dot that marks
 * the exact coordinate. Brand colour by default, accent for featured; the
 * selected marker pops larger and lifts its z-index.
 *
 * `tracksViewChanges` must be true for the custom child to rasterise, but
 * leaving it on tanks frame-rate with many markers — so we keep it true only
 * briefly after mount and whenever `selected`/`refresh` changes, then off.
 * `refresh` (parent's focusEpoch) re-arms it on tab refocus.
 */
function MapPriceMarkerBase({ item, selected, refresh, onPress }: Props) {
  const tone = item.isFeatured ? ACCENT : BRAND
  const [tracks, setTracks] = useState(true)

  useEffect(() => {
    setTracks(true)
    const t = setTimeout(() => setTracks(false), 500)
    return () => clearTimeout(t)
  }, [selected, refresh])

  return (
    <Marker
      coordinate={{ latitude: item.latitude as number, longitude: item.longitude as number }}
      onPress={(e) => { e.stopPropagation?.(); onPress(item) }}
      // The dot at the bottom of the view sits on the coordinate.
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
      zIndex={selected ? 999 : 1}
    >
      <View style={styles.wrap}>
        <View style={[styles.pill, { backgroundColor: tone }, selected && styles.pillSelected]}>
          <Text style={[styles.price, selected && styles.priceSelected]} numberOfLines={1}>
            {formatPricePill(item.price, item.priceUnit)}
          </Text>
          <Text style={[styles.sub, selected && styles.subSelected]} numberOfLines={1}>
            {subLabel(item)}
          </Text>
        </View>
        <View style={[styles.stem, { backgroundColor: tone }]} />
        <View style={[styles.dot, { backgroundColor: tone }, selected && styles.dotSelected]} />
      </View>
    </Marker>
  )
}

export const MapPriceMarker = memo(MapPriceMarkerBase)

const styles = StyleSheet.create({
  // The selected marker grows via real layout (padding/font/dot), NOT a
  // transform — react-native-maps rasterises only the layout box, so a scaled
  // transform clips whatever overflows it. Bigger layout keeps the pill whole.
  wrap: { alignItems: 'center' },
  pill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#fff', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 4,
  },
  pillSelected: { paddingHorizontal: 15, paddingVertical: 7 },
  // Explicit lineHeight: the shared Text wrapper turns includeFontPadding off,
  // which leaves no slack for tall glyphs in a two-line box this tight.
  price:         { color: '#fff', fontFamily: fonts.extra, fontSize: 13, lineHeight: 16 },
  priceSelected: { fontSize: 15, lineHeight: 19 },
  sub:           { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13 },
  subSelected:   { fontSize: 11, lineHeight: 14 },
  // Stem + dot replace the old border-triangle tail: the mockup marks the
  // coordinate with a dot, and two plain views rasterise more reliably than a
  // zero-size bordered triangle did.
  stem:        { width: 2, height: 5 },
  dot:         { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: '#fff' },
  dotSelected: { width: 9, height: 9, borderRadius: 5 },
})
