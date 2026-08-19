import { ScrollView, StyleSheet } from 'react-native'
import { MINI_CARD_WIDTH, PropertyMiniCard } from './PropertyMiniCard'
import { spacing } from '../../theme'
import type { PropertyCard } from '../../types'

/**
 * ⑪ Horizontal rail of similar listings.
 *
 * Renders nothing at all when the list is empty — the screen skips the whole
 * section card rather than leaving a titled section with a blank strip under it.
 */
export function SimilarRail({
  items, onPressItem,
}: {
  items: PropertyCard[]
  onPressItem: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={MINI_CARD_WIDTH + spacing.md}
      decelerationRate="fast"
      contentContainerStyle={styles.content}
    >
      {items.map((item) => (
        <PropertyMiniCard key={item.id} item={item} onPress={() => onPressItem(item.id)} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingRight: spacing.xs },
})
