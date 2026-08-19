import { useRef, useState } from 'react'
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import type { PropertyImage } from '../../types'

const screenW = Dimensions.get('window').width
const GALLERY_H = 300

/**
 * ① Image carousel — paging scroll, "n / N Photos" pill, dot indicator and a
 * thumbnail strip.
 *
 * The primary image is hoisted to the front so the card image a buyer tapped is
 * the first thing they see here; anything else reads as the wrong listing opening.
 */
export function Gallery({ images }: { images: PropertyImage[] }) {
  const [active, setActive] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const primary = images.find((i) => i.isPrimary) ?? images[0]
  const ordered = primary ? [primary, ...images.filter((i) => i.id !== primary.id)] : images

  if (!ordered.length) {
    return (
      <View style={[styles.frame, styles.empty]}>
        <Ionicons name="image-outline" size={30} color={colors.mutedLight} />
        <Text style={styles.emptyText}>No photos yet</Text>
      </View>
    )
  }

  return (
    <View>
      <View style={styles.frame}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setActive(Math.round(e.nativeEvent.contentOffset.x / screenW))
          }
        >
          {ordered.map((img) => (
            <Image key={img.id} source={{ uri: img.url }} style={styles.image} resizeMode="cover" />
          ))}
        </ScrollView>

        <View style={styles.countPill}>
          <Ionicons name="images-outline" size={12} color={colors.white} />
          <Text style={styles.countText}>
            {active + 1} / {ordered.length} Photos
          </Text>
        </View>

        {ordered.length > 1 ? (
          <View style={styles.dots}>
            {ordered.map((img, i) => (
              <View key={img.id} style={[styles.dot, i === active && styles.dotOn]} />
            ))}
          </View>
        ) : null}
      </View>

      {ordered.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbs}
        >
          {ordered.map((img, i) => (
            <Pressable
              key={img.id}
              onPress={() => {
                scrollRef.current?.scrollTo({ x: i * screenW, animated: true })
                setActive(i)
              }}
            >
              <Image
                source={{ uri: img.url }}
                style={[styles.thumb, i === active && styles.thumbOn]}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { width: screenW, height: GALLERY_H, backgroundColor: colors.border },
  image: { width: screenW, height: GALLERY_H },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },

  countPill: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(15,51,47,0.78)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  // Fixed-height pill: an explicit lineHeight is required because
  // includeFontPadding is off app-wide (see src/components/Text.tsx).
  countText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.white },

  dots: {
    position: 'absolute', left: 0, right: 0, bottom: spacing.lg,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { backgroundColor: colors.white, width: 16 },

  thumbs:  { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  thumb:   { width: 62, height: 48, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.brand },
})
