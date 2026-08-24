import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../src/components/Text'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, listingTypeLabel, prettyEnum, priceTypeLabel } from '../src/lib/format'
import { useCompareStore } from '../src/lib/compareStore'
import { colors, fonts, radius, shadow, typography } from '../src/theme'
import type { PropertyCard } from '../src/types'

const BRAND = colors.brand

const SCREEN_W = Dimensions.get('window').width
const LABEL_W = 104
// Two columns fit the screen; three or four spill and the table scrolls. 128 is
// the floor at which "Semi Furnished" and "₹22,000/mo" still fit on one line.
const COL_W = (n: number) => Math.max(128, Math.floor((SCREEN_W - LABEL_W - 32) / n))

/**
 * Side-by-side comparison of the properties ticked on the Saved tab.
 *
 * Reads whole `PropertyCard`s out of `useCompareStore` — see the note there on
 * why they are handed over rather than serialised into route params. Every row
 * below is a field that already exists on that DTO; nothing here refetches, so
 * the table can only ever show what the Saved list itself was showing.
 */
export default function CompareScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const items = useCompareStore((s) => s.items)

  const colW = COL_W(items.length || 1)

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Compare</Text>
          <Text style={styles.headerSub}>
            {items.length > 0 ? `${items.length} saved properties, side by side` : 'Nothing selected'}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="copy-outline" size={40} color={BRAND} /></View>
          <Text style={styles.emptyTitle}>Nothing to compare</Text>
          <Text style={styles.emptySub}>
            Tick two or more properties on the Saved tab, then tap Compare.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.cta}>
            <Text style={styles.ctaText}>Back to Saved</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        >
          {/* Vertical OUTSIDE, horizontal inside — not the other way round. A
              vertical ScrollView nested in a horizontal one is laid out at its
              full content height (the parent gives it no bound), so it never
              scrolls and the bottom rows of a 13-row table are unreachable. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              {/* Header row — photo, title and a tap-through to the listing */}
              <View style={styles.row}>
                <View style={[styles.labelCell, styles.headCell]} />
                {items.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/properties/${p.id}`)}
                    style={({ pressed }) => [styles.cell, styles.headCell, { width: colW }, pressed && { opacity: 0.85 }]}
                  >
                    {p.primaryImageUrl ? (
                      <Image source={{ uri: p.primaryImageUrl }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Ionicons name="image-outline" size={20} color={colors.mutedLight} />
                      </View>
                    )}
                    <Text style={styles.headTitle} numberOfLines={2}>{p.title}</Text>
                    <View style={styles.headLink}>
                      <Text style={styles.headLinkText}>View</Text>
                      <Ionicons name="arrow-forward" size={10} color={BRAND} />
                    </View>
                  </Pressable>
                ))}
              </View>

              {ROWS.map((r, i) => (
                <View key={r.label} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                  <View style={styles.labelCell}>
                    <Text style={styles.labelText}>{r.label}</Text>
                  </View>
                  {items.map((p) => (
                    <View key={p.id} style={[styles.cell, { width: colW }]}>
                      <Text style={[styles.valueText, r.strong && styles.valueStrong]} numberOfLines={2}>
                        {r.value(p)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

/** An em dash, never "null" or "0", for a field this listing simply does not have. */
const DASH = '—'

const ROWS: { label: string; value: (p: PropertyCard) => string; strong?: boolean }[] = [
  { label: 'Price',       value: (p) => formatPrice(p.price, p.priceUnit), strong: true },
  { label: 'Price type',  value: (p) => priceTypeLabel(p.priceUnit, p.priceNegotiable) },
  { label: 'Rate',        value: (p) => ratePerSqft(p) },
  { label: 'Locality',    value: (p) => `${p.localityName}, ${p.cityName}` },
  { label: 'Listing',     value: (p) => listingTypeLabel(p.listingType) },
  { label: 'Type',        value: (p) => prettyEnum(p.propertyType) },
  { label: 'Area',        value: (p) => `${p.areaSqft.toLocaleString('en-IN')} sq.ft` },
  { label: 'Bedrooms',    value: (p) => (p.bedrooms ? `${p.bedrooms} BHK` : DASH) },
  { label: 'Bathrooms',   value: (p) => (p.bathrooms ? String(p.bathrooms) : DASH) },
  { label: 'Furnishing',  value: (p) => prettyEnum(p.furnishing) },
  { label: 'Parking',     value: (p) => (p.parkingCount != null ? String(p.parkingCount) : DASH) },
  { label: 'Verified',    value: (p) => (p.isVerified ? 'Yes' : 'No') },
  { label: 'Featured',    value: (p) => (p.isFeatured ? 'Yes' : 'No') },
]

/**
 * Price per sq.ft, the number buyers actually compare plots and flats on.
 * Only meaningful on a total price — dividing a monthly rent by the area gives
 * a figure that looks like a rate and means nothing, so rentals show a dash.
 */
function ratePerSqft(p: PropertyCard): string {
  if (p.priceUnit === 'PER_SQFT') return `₹${p.price.toLocaleString('en-IN')} / sq.ft`
  if (p.priceUnit !== 'TOTAL' || !p.areaSqft) return DASH
  return `₹${Math.round(p.price / p.areaSqft).toLocaleString('en-IN')} / sq.ft`
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: BRAND },
  headerTitle: { ...typography.screenTitle, color: colors.white },
  headerSub:   { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.82)', marginTop: 2 },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  emptySub:   { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  cta:        { marginTop: 18, backgroundColor: BRAND, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.sm },
  ctaText:    { ...typography.button },

  // One card holding the whole grid, so the zebra rows are clipped to the
  // rounded corners instead of painting square edges over them.
  table:      { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  // Rows are flex rows of fixed-width cells: that is what keeps every column
  // aligned without measuring anything, and it is why cells clamp their text
  // rather than wrapping freely.
  row:        { flexDirection: 'row', alignItems: 'stretch' },
  rowAlt:     { backgroundColor: '#FBFAF7' },
  headCell:   { backgroundColor: colors.brandTint, paddingVertical: 10 },

  labelCell:  { width: LABEL_W, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 11, borderRightWidth: 1, borderRightColor: colors.borderLight },
  labelText:  { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 16, color: colors.muted },

  cell:       { justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 11, borderRightWidth: 1, borderRightColor: colors.borderLight },
  valueText:  { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.ink },
  valueStrong:{ fontFamily: fonts.extra, fontSize: 15, lineHeight: 20, color: BRAND },

  thumb:      { width: '100%', height: 72, borderRadius: radius.sm, backgroundColor: colors.border },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  headTitle:  { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.ink, marginTop: 7 },
  headLink:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  headLinkText: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, color: BRAND },
})
