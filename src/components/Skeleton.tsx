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
 * Property-detail skeleton, matched to the redesigned above-the-fold layout:
 * 300px gallery, thumbnail strip, badge row, title, location, price, then the
 * 5-cell spec strip as a 3+2 grid. The shapes track what actually paints so the
 * hand-off from skeleton to content does not visibly jump.
 */
export function DetailSkeleton() {
  return (
    <View>
      <Skeleton style={{ width: '100%', height: 300, borderRadius: 0 }} />
      <View style={styles.detailThumbs}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ width: 62, height: 48, borderRadius: radius.sm }} />
        ))}
      </View>
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
  block: { backgroundColor: colors.border, borderRadius: 4 },
  list:  { padding: 16 },
  card:  {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md,
    marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden', ...shadow.card,
  },
  image: { width: 110, height: 120, borderRadius: 0 },
  body:  { flex: 1, padding: 12, gap: 8 },
  detailBody:  { padding: 16, gap: 10 },
  detailChips: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  detailThumbs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  detailCard: {
    marginHorizontal: 16, marginTop: 12, padding: 16,
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  detailSpecGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specCell: { width: '31.6%', height: 74, borderRadius: radius.md },
  chip: { width: 84, height: 34, borderRadius: radius.md },
})
