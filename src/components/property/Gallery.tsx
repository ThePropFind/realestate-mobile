import { useState } from 'react'
import { Dimensions, Image, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import type { PropertyImage } from '../../types'

const screenW = Dimensions.get('window').width
const GALLERY_H = 300

// Above this many photos the dots become a smear and collide with the count
// pill, which already says "3 / 12 Photos" — so they are dropped instead.
const MAX_DOTS = 8

/**
 * How far the detail screen's white content sheet rides up over the gallery so
 * its rounded top corners read against the photo. Exported so the pill and dots
 * can clear it — they are positioned from the gallery's bottom edge, which the
 * sheet covers. Keeping both sides on this one constant stops them drifting apart.
 */
export const SHEET_OVERLAP = 20

/**
 * ① Image carousel — paging scroll, bottom-left "n / N Photos" pill and a dot
 * indicator. No thumbnail strip: it duplicated the pager, ate 60dp above the
 * fold and is not in the design.
 *
 * The primary image is hoisted to the front so the card image a buyer tapped is
 * the first thing they see here; anything else reads as the wrong listing opening.
 */
export function Gallery({ images }: { images: PropertyImage[] }) {
  const [active, setActive] = useState(0)

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
    <View style={styles.frame}>
      <ScrollView
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
        <Ionicons name="camera-outline" size={12} color={colors.white} />
        <Text style={styles.countText}>
          {active + 1} / {ordered.length} Photos
        </Text>
      </View>

      {ordered.length > 1 && ordered.length <= MAX_DOTS ? (
        <View style={styles.dots}>
          {ordered.map((img, i) => (
            <View key={img.id} style={[styles.dot, i === active && styles.dotOn]} />
          ))}
        </View>
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
    position: 'absolute', left: spacing.lg, bottom: spacing.lg + SHEET_OVERLAP,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(15,51,47,0.78)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  // Fixed-height pill: an explicit lineHeight is required because
  // includeFontPadding is off app-wide (see src/components/Text.tsx).
  countText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.white },

  dots: {
    position: 'absolute', left: 0, right: 0, bottom: spacing.lg + SHEET_OVERLAP,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { backgroundColor: colors.white, width: 14 },
})
