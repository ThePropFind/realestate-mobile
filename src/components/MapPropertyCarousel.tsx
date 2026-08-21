import { forwardRef } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, priceTypeLabel } from '../lib/format'
import { colors, fonts, radius, shadow } from '../theme'
import type { PropertyCard } from '../types'

const BRAND  = colors.brand
const ACCENT = colors.accent

const { width: SCREEN_W } = Dimensions.get('window')
export const CARD_W = SCREEN_W - 48          // peek the neighbours on both sides
export const CARD_GAP = 12
export const SNAP = CARD_W + CARD_GAP
/**
 * Photo panel ≈ 34% of the card. Deliberately narrower than the mockup's eyeball
 * 38%: the badge row has to seat Verified + Featured + Negotiable on ONE line,
 * and at 38% the third badge wrapped to a second row on a 393pt phone.
 */
const PHOTO_W = Math.min(140, Math.max(104, Math.round(CARD_W * 0.34)))

interface Props {
  items: PropertyCard[]
  onOpen: (item: PropertyCard) => void
  onSnap: (item: PropertyCard) => void
}

/**
 * Bottom horizontal card carousel, synced both ways with the map markers:
 * - parent drives it via the forwarded ref (`scrollToIndex`) when a marker is tapped;
 * - swiping fires `onSnap` so the parent can pan/select the matching marker.
 */
export const MapPropertyCarousel = forwardRef<FlatList<PropertyCard>, Props>(
  function MapPropertyCarousel({ items, onOpen, onSnap }, ref) {
    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP)
      const item = items[idx]
      if (item) onSnap(item)
    }

    return (
      <FlatList
        ref={ref}
        data={items}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        onMomentumScrollEnd={onMomentumEnd}
        // Fixed-width cards → cheap, accurate scrollToIndex from the parent.
        getItemLayout={(_, index) => ({ length: SNAP, offset: SNAP * index, index })}
        renderItem={({ item }) => <Card item={item} onOpen={onOpen} />}
      />
    )
  },
)

/** One trust/price badge above the title. Only truthy flags render. */
function Badge({ icon, label, tone }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  tone: string
}) {
  return (
    <View style={[styles.badge, { borderColor: tone }]}>
      <Ionicons name={icon} size={8} color={tone} />
      <Text style={[styles.badgeText, { color: tone }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

/**
 * One column of the spec strip: icon + value on the first line, unit below.
 * Type is deliberately small — the mockup's photo panel leaves roughly 180pt
 * for up to five labelled specs, the same squeeze as PropertyMiniCard's
 * action row.
 */
function Spec({ icon, value, label }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  value: string
  label: string
}) {
  return (
    <View style={styles.spec}>
      <Ionicons name={icon} size={10} color={colors.muted} />
      <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.specLabel} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const TYPE_SHORT: Record<string, string> = {
  APARTMENT:         'Flat',
  BUILDER_FLOOR:     'Floor',
  INDEPENDENT_HOUSE: 'House',
  VILLA:             'Villa',
  PLOT:              'Plot',
  AGRICULTURAL_LAND: 'Farm',
  COMMERCIAL_OFFICE: 'Office',
  COMMERCIAL_SHOP:   'Shop',
  WAREHOUSE:         'Store',
  PG_HOSTEL:         'PG',
}

function Card({ item, onOpen }: { item: PropertyCard; onOpen: (item: PropertyCard) => void }) {
  const hasBadge = item.isVerified || item.isFeatured || item.priceNegotiable
  return (
    <Pressable style={styles.card} onPress={() => onOpen(item)}>
      <View style={styles.thumbWrap}>
        {item.primaryImageUrl ? (
          <Image source={{ uri: item.primaryImageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="image-outline" size={22} color={colors.mutedLight} />
          </View>
        )}
        {item.isFeatured ? (
          <View style={styles.featuredTag}><Text style={styles.featuredTagText}>Featured</Text></View>
        ) : null}
        {/* Photo count, mockup's "1/20" — imageCount is 0 on listings whose
            photos were never uploaded, so the counter hides rather than lying. */}
        {item.imageCount > 0 ? (
          <View style={styles.countTag}>
            <Ionicons name="images-outline" size={9} color="#fff" />
            <Text style={styles.countTagText}>1/{item.imageCount}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {hasBadge ? (
          <View style={styles.badgeRow}>
            {item.isVerified ? <Badge icon="shield-checkmark" label="Verified" tone={colors.success} /> : null}
            {item.isFeatured ? <Badge icon="star" label="Featured" tone={colors.accentDeep} /> : null}
            {item.priceNegotiable ? <Badge icon="pricetag" label="Negotiable" tone={BRAND} /> : null}
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.localityName}, {item.cityName}</Text>

        <Text style={styles.price} numberOfLines={1}>{formatPrice(item.price, item.priceUnit)}</Text>
        <Text style={styles.priceKind} numberOfLines={1}>
          {priceTypeLabel(item.priceUnit, item.priceNegotiable)}
        </Text>

        <View style={styles.specRow}>
          {item.bedrooms != null ? (
            <Spec icon="bed-outline" value={String(item.bedrooms)} label="BHK" />
          ) : null}
          {item.bathrooms != null ? (
            <Spec icon="water-outline" value={String(item.bathrooms)} label="Bath" />
          ) : null}
          <Spec icon="resize-outline" value={item.areaSqft.toLocaleString('en-IN')} label="sq.ft" />
          <Spec icon="home-outline" value={TYPE_SHORT[item.propertyType] ?? '—'} label="Type" />
          {/* Only when the seller gave a number — PropertyCard has no legacy
              parkingAvailable boolean, so a null count would print "0" and
              assert "no parking" on rows that simply never said. */}
          {item.parkingCount != null ? (
            <Spec icon="car-outline" value={String(item.parkingCount)} label="Park" />
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // flex-start, not the default stretch: a horizontal FlatList's cross axis is
  // vertical, so every card was being stretched to the tallest sibling — which
  // is what left a blank strip under the shorter cards. Same trap as the home
  // featured row hit on 2026-07-20.
  list: { paddingHorizontal: 24, alignItems: 'flex-start' },
  card: {
    width: CARD_W, flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden',
    ...shadow.raised,
  },
  thumbWrap: { width: PHOTO_W, backgroundColor: colors.border },
  thumb:     { width: '100%', height: '100%' },
  thumbEmpty:{ alignItems: 'center', justifyContent: 'center' },
  featuredTag:     { position: 'absolute', top: 8, left: 8, backgroundColor: ACCENT, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  featuredTagText: { color: '#fff', fontFamily: fonts.extra, fontSize: 10 },
  countTag: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  countTagText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 9, lineHeight: 12 },

  body: { flex: 1, paddingHorizontal: 11, paddingVertical: 8 },

  // Never wraps. flexShrink lets the labels ellipsize on a very narrow phone
  // rather than dropping to a second row, which is what the mockup shows and
  // what pushed the card's height up by a whole line when it happened.
  badgeRow: { flexDirection: 'row', gap: 4, marginBottom: 5, flexWrap: 'nowrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1,
    borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 1.5,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 10, flexShrink: 1 },

  title:     { fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, color: colors.ink },
  sub:       { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.muted },
  price:     { fontFamily: fonts.extra, fontSize: 15, lineHeight: 19, color: BRAND, marginTop: 5 },
  priceKind: { fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 12, color: colors.mutedLight },

  specRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  spec:      { flex: 1, alignItems: 'center' },
  specValue: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, color: colors.ink },
  specLabel: { fontFamily: fonts.regular, fontSize: 8, lineHeight: 10, color: colors.mutedLight },
})
