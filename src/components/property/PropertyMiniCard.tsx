import { Image, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CardChip, CardLocation, CardPrice, CardSpecs, CardTitle, CARD_SCALE, listingSpecs } from './CardAtoms'
import { colors, radius, shadow, spacing } from '../../theme'
import { formatPrice } from '../../lib/format'
import type { PropertyCard } from '../../types'

export const MINI_CARD_WIDTH = 190

const SIZE = 'sm' as const

/**
 * Compact listing card — the home "Recommended For You" rail and the detail
 * screen's "Similar Properties" rail.
 *
 * Reads top-to-bottom in the app's fixed card order (title → location → price →
 * specs), same as every other listing card. It used to lead with the price and
 * print the locality as bare text with no pin, which made the same listing look
 * like a different product depending on which rail you found it in.
 *
 * `width` defaults to the rail's fixed card width; callers can pass a computed
 * value where two must fit per row on a narrow phone.
 */
export function PropertyMiniCard({
  item, onPress, width = MINI_CARD_WIDTH, saved = false, onToggleSave,
}: {
  item: PropertyCard
  onPress: () => void
  width?: number
  /** Heart state — only read when `onToggleSave` is supplied. */
  saved?: boolean
  /** Omit to render the card without a heart (the similar rail does). */
  onToggleSave?: (id: string) => void
}) {
  // No bathroom count at this width — beds and area are what a rail card is
  // scanned for, and a third cell pushes the strip into an ellipsis.
  const specs = listingSpecs(item, { baths: false })

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width }, pressed && { opacity: 0.9 }]}>
      {item.primaryImageUrl ? (
        <Image source={{ uri: item.primaryImageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Ionicons name="image-outline" size={22} color={colors.mutedLight} />
        </View>
      )}
      {onToggleSave ? (
        <Pressable
          onPress={() => onToggleSave(item.id)}
          hitSlop={8}
          style={({ pressed }) => [styles.heart, pressed && { opacity: 0.8 }]}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={15}
            color={saved ? colors.accent : colors.brand}
          />
        </Pressable>
      ) : null}

      <View style={styles.body}>
        <CardTitle size={SIZE}>{item.title}</CardTitle>
        <CardLocation size={SIZE} item={item} showCity={false} />
        <CardPrice size={SIZE}>{formatPrice(item.price, item.priceUnit)}</CardPrice>
        <CardSpecs size={SIZE} specs={specs} />
        {/* Verification is the one badge worth the extra row here — the property
            type is already doing its work in the title. */}
        {item.isVerified ? (
          <View style={styles.chipRow}>
            <CardChip size={SIZE} icon="shield-checkmark-outline" label="Verified" />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow.card,
  },
  image:   { width: '100%', height: 110, backgroundColor: colors.border },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  heart:   {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
    ...shadow.card,
  },
  body:    { padding: spacing.md, gap: CARD_SCALE.sm.gap },
  chipRow: { flexDirection: 'row', marginTop: 1 },
})
