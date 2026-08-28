import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, shadow } from '../theme'

/** Pulsing placeholder block — the shimmer primitive for loading states. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return <Animated.View style={[styles.block, style, { opacity }]} />
}

/** Row-card skeleton matching the list cards on Search / Saved / My Listings / Bookings. */
export function CardRowSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.image} />
      <View style={styles.body}>
        <Skeleton style={{ width: 70, height: 16 }} />
        <Skeleton style={{ width: '85%', height: 14 }} />
        <Skeleton style={{ width: '60%', height: 12 }} />
        <Skeleton style={{ width: '45%', height: 14 }} />
      </View>
    </View>
  )
}

/** A padded column of row-card skeletons — drop-in for a loading FlatList. */
export function ListSkeleton({ count = 5, padded = true }: { count?: number; padded?: boolean }) {
  return (
    <View style={padded ? styles.list : undefined}>
      {Array.from({ length: count }, (_, i) => <CardRowSkeleton key={i} />)}
    </View>
  )
}

/**
 * Featured-rail skeleton — the big photo card on home's "Featured Property".
 *
 * That rail used to fall back to real `FeaturedCollectionCard`s with no
 * property, which painted an empty pale-sage photo box and nothing else: it
 * read as a *loaded* card with a missing image rather than as loading. Shapes
 * track what actually paints (photo, title, locality, price row, spec strip) so
 * the hand-off to content does not jump.
 */
export function FeaturedCardSkeleton({ width, imageHeight = 148, imageWidth }: { width: number; imageHeight?: number; imageWidth?: number }) {
  return (
    <View style={[styles.featured, { width }]}>
      <Skeleton style={[styles.featuredImg, { height: imageHeight, width: imageWidth ?? Math.round((width - 20) * 0.46) }]} />
      <View style={styles.featuredBody}>
        <Skeleton style={{ width: '55%', height: 11 }} />
        <Skeleton style={{ width: '85%', height: 16 }} />
        <Skeleton style={{ width: '60%', height: 18 }} />
        <Skeleton style={{ width: '75%', height: 12 }} />
        <Skeleton style={{ width: '50%', height: 16, borderRadius: 7 }} />
      </View>
    </View>
  )
}

/**
 * Property-detail skeleton, matched to the redesigned above-the-fold layout:
 * 300px gallery, badge row, title, location, price, then the 5-cell spec strip
 * as a single row. The shapes track what actually paints so the hand-off from
 * skeleton to content does not visibly jump — which is why there is no thumbnail
 * strip here and why the spec cells are 5-across, not a 3+2 grid.
 */
export function DetailSkeleton() {
  return (
    <View>
      <Skeleton style={{ width: '100%', height: 300, borderRadius: 0 }} />
      <View style={styles.detailBody}>
        <View style={styles.detailChips}>
          <Skeleton style={styles.chip} />
          <Skeleton style={styles.chip} />
        </View>
        <Skeleton style={{ width: '85%', height: 24 }} />
        <Skeleton style={{ width: '50%', height: 14 }} />
        <Skeleton style={{ width: '40%', height: 28 }} />
      </View>
      <View style={styles.detailCard}>
        <View style={styles.detailSpecGrid}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} style={styles.specCell} />
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // brandTint, not the old grey `colors.border`: a loading block is the same
  // "nothing here yet" state as the pale sage no-image placeholder on the
  // featured cards, and the two used to sit on screen together in two
  // different greys. One colour for one meaning.
  block: { backgroundColor: colors.brandTint, borderRadius: 4 },
  list:  { padding: 16 },
  card:  {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md,
    marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden', ...shadow.card,
  },
  image: { width: 110, height: 120, borderRadius: 0 },
  featured:     { flexDirection: 'row', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: colors.white, ...shadow.card },
  featuredImg:  { borderRadius: radius.md },
  featuredBody: { flex: 1, justifyContent: 'center', gap: 8 },
  body:  { flex: 1, padding: 12, gap: 8 },
  detailBody:  { padding: 16, gap: 10 },
  detailChips: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  detailCard: {
    marginHorizontal: 16, marginTop: 12, padding: 16,
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  detailSpecGrid: { flexDirection: 'row', gap: 8 },
  specCell: { flex: 1, height: 56, borderRadius: radius.md },
  chip: { width: 84, height: 34, borderRadius: radius.md },
})
