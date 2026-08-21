import { Image, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, shadow, spacing } from '../../theme'
import { formatPrice } from '../../lib/format'
import type { PropertyCard } from '../../types'

export const MINI_CARD_WIDTH = 190

/**
 * Compact listing card.
 *
 * `width` defaults to the rail's fixed card width; the owner profile passes a
 * computed half-screen value so two fit per row on a narrow phone.
 */
export function PropertyMiniCard({
  item, onPress, width = MINI_CARD_WIDTH, saved = false, onToggleSave,
}: {
  item: PropertyCard
  onPress: () => void
  width?: number
  /** Heart state — only read when `onToggleSave` is supplied. */
  saved?: boolean
  /** Omit to render the card without a heart (the similar rail and owner grid do). */
  onToggleSave?: (id: string) => void
}) {
  const specs = [
    item.bedrooms != null ? `${item.bedrooms} BHK` : null,
    item.areaSqft ? `${item.areaSqft} sq.ft` : null,
  ].filter(Boolean).join(' · ')

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
        <Text style={styles.price}>{formatPrice(item.price, item.priceUnit)}</Text>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{item.localityName}</Text>
        {specs ? <Text style={styles.meta} numberOfLines={1}>{specs}</Text> : null}
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
  body:    { padding: spacing.md, gap: 2 },
  price:   { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.brand },
  title:   { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.ink },
  meta:    { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.muted },
})
