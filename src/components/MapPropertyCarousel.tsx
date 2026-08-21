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
/** Photo panel ≈ 38% of the card, matching the mockup and the home mini-card. */
const PHOTO_W = Math.min(150, Math.max(112, Math.round(CARD_W * 0.38)))

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
      <Ionicons name={icon} size={9} color={tone} />
      <Text style={[styles.badgeText, { color: tone }]}>{label}</Text>
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
      <Ionicons name={icon} size={11} color={colors.muted} />
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
  list: { paddingHorizontal: 24 },
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

  body: { flex: 1, paddingHorizontal: 11, paddingVertical: 10 },

  badgeRow: { flexDirection: 'row', gap: 4, marginBottom: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 2.5,
    borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 11 },

  title:     { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink },
  sub:       { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.muted, marginTop: 1 },
  price:     { fontFamily: fonts.extra, fontSize: 16, lineHeight: 21, color: BRAND, marginTop: 6 },
  priceKind: { fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 13, color: colors.mutedLight },

  specRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  spec:      { flex: 1, alignItems: 'center', gap: 1 },
  specValue: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: colors.ink },
  specLabel: { fontFamily: fonts.regular, fontSize: 8, lineHeight: 11, color: colors.mutedLight },
})
