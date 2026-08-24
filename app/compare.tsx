import { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../src/components/Text'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  approvalShort, formatPrice, listingTypeLabel, parkingLabel,
  possessionLabel, prettyEnum, priceTypeLabel,
} from '../src/lib/format'
import { propertyApi } from '../src/lib/api'
import { useCompareStore } from '../src/lib/compareStore'
import { colors, fonts, radius, shadow, typography } from '../src/theme'
import type { PropertyCard, PropertyDetail } from '../src/types'

const BRAND = colors.brand

const SCREEN_W = Dimensions.get('window').width
const LABEL_W = 108
// Two columns fit the screen; three or four spill and the table scrolls. 132 is
// the floor at which "Semi Furnished" and "₹35,000/mo" still fit on one line.
const COL_W = (n: number) => Math.max(132, Math.floor((SCREEN_W - LABEL_W - 32) / n))

const DASH = '—'

/** One column: the card we already had, plus the detail once it lands. */
interface Column { card: PropertyCard; detail: PropertyDetail | null }

type Icon = React.ComponentProps<typeof Ionicons>['name']

/**
 * Side-by-side comparison of the properties ticked on the Saved tab.
 *
 * The columns render immediately from the `PropertyCard`s handed over in
 * `useCompareStore` — see the note there on why they are passed rather than
 * serialised into route params. The detail rows need fields the card DTO does
 * not carry (carpet area, floor, facing, possession, approval, amenities), so
 * each listing is fetched once on mount and the table fills in underneath a
 * header that is already on screen.
 *
 * Rows are grouped, and rows where "more" or "less" genuinely means better carry
 * a `best` comparator — the winning cell gets a tick. That is the whole point of
 * a comparison table; without it this is just three detail pages side by side.
 */
export default function CompareScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const items = useCompareStore((s) => s.items)

  const [cols, setCols] = useState<Column[]>(() => items.map((card) => ({ card, detail: null })))
  const [loading, setLoading] = useState(items.length > 0)

  useEffect(() => {
    if (!items.length) return
    let alive = true
    ;(async () => {
      // allSettled, not all: one dead listing (deleted, or moved out of ACTIVE
      // since it was saved) must not blank the whole table. That column simply
      // keeps showing what the card knew.
      const results = await Promise.allSettled(items.map((p) => propertyApi.getById(p.id)))
      if (!alive) return
      setCols(items.map((card, i) => {
        const r = results[i]
        return { card, detail: r.status === 'fulfilled' ? r.value.data : null }
      }))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [items])

  const colW = COL_W(cols.length || 1)
  const groups = buildGroups(cols)

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Compare</Text>
          <Text style={styles.headerSub}>
            {cols.length > 0 ? `${cols.length} saved properties, side by side` : 'Nothing selected'}
          </Text>
        </View>
        {loading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
      </View>

      {cols.length === 0 ? (
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
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }}
        >
          {/* Vertical OUTSIDE, horizontal inside — not the other way round. A
              vertical ScrollView nested in a horizontal one is laid out at its
              full content height (the parent gives it no bound), so it never
              scrolls and the bottom rows are unreachable. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              {/* ── Column headers ── */}
              <View style={styles.headRow}>
                {/* The top-left cell used to be blank, which read as a hole in
                    the corner of the table. It now carries the legend for the
                    tick the `best` rows use. */}
                <View style={[styles.labelCell, styles.headLabelCell]}>
                  <Ionicons name="git-compare-outline" size={17} color={BRAND} />
                  <Text style={styles.headLabelText}>Best value</Text>
                  <View style={styles.legendRow}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                    <Text style={styles.legendText}>marked</Text>
                  </View>
                </View>
                {cols.map(({ card }) => (
                  <Pressable
                    key={card.id}
                    onPress={() => router.push(`/properties/${card.id}`)}
                    style={({ pressed }) => [styles.headCell, { width: colW }, pressed && { opacity: 0.85 }]}
                  >
                    <View style={styles.thumbWrap}>
                      {card.primaryImageUrl ? (
                        <Image source={{ uri: card.primaryImageUrl }} style={styles.thumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumb, styles.thumbEmpty]}>
                          <Ionicons name="image-outline" size={20} color={colors.mutedLight} />
                        </View>
                      )}
                      {card.isVerified ? (
                        <View style={styles.verifiedDot}>
                          <Ionicons name="shield-checkmark" size={10} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.headTitle} numberOfLines={2}>{card.title}</Text>
                    <Text style={styles.headPrice} numberOfLines={1}>
                      {formatPrice(card.price, card.priceUnit)}
                    </Text>
                    <View style={styles.headLink}>
                      <Text style={styles.headLinkText}>View listing</Text>
                      <Ionicons name="arrow-forward" size={10} color={BRAND} />
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* ── Grouped rows ── */}
              {groups.map((g) => (
                <View key={g.title}>
                  <View style={styles.groupRow}>
                    <Ionicons name={g.icon} size={13} color={BRAND} />
                    <Text style={styles.groupText}>{g.title}</Text>
                  </View>
                  {g.rows.map((r, i) => {
                    const values = cols.map((c) => r.value(c))
                    const winners = r.best ? winnersOf(cols, r.best) : []
                    return (
                      <View key={r.label} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                        <View style={styles.labelCell}>
                          <Text style={styles.labelText}>{r.label}</Text>
                        </View>
                        {values.map((v, ci) => {
                          const won = winners.includes(ci)
                          return (
                            <View key={cols[ci].card.id} style={[styles.cell, { width: colW }, won && styles.cellBest]}>
                              <View style={styles.cellInner}>
                                <Text
                                  style={[styles.valueText, r.strong && styles.valueStrong, won && styles.valueBest]}
                                  numberOfLines={2}
                                >
                                  {v}
                                </Text>
                                {won ? <Ionicons name="checkmark-circle" size={13} color={colors.success} /> : null}
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              ))}

              {/* ── Amenities matrix ── */}
              {amenityNames(cols).length ? (
                <View>
                  <View style={styles.groupRow}>
                    <Ionicons name="sparkles-outline" size={13} color={BRAND} />
                    <Text style={styles.groupText}>Amenities</Text>
                  </View>
                  {amenityNames(cols).map((name, i) => (
                    <View key={name} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                      <View style={styles.labelCell}>
                        <Text style={styles.labelText} numberOfLines={2}>{name}</Text>
                      </View>
                      {cols.map((c) => {
                        const has = c.detail?.amenities?.some((a) => a.name === name)
                        return (
                          <View key={c.card.id} style={[styles.cell, { width: colW }]}>
                            {c.detail == null ? (
                              <Text style={styles.valueText}>{DASH}</Text>
                            ) : has ? (
                              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                            ) : (
                              <Ionicons name="remove-circle-outline" size={17} color={colors.mutedLight} />
                            )}
                          </View>
                        )
                      })}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </ScrollView>

          {loading ? (
            <Text style={styles.loadingNote}>Loading full details…</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ─── rows ────────────────────────────────────────────────────────

interface Row {
  label: string
  value: (c: Column) => string
  /** Only where more/less genuinely means better. Higher score wins; null = out of the running. */
  best?: (c: Column) => number | null
  strong?: boolean
}

interface Group { title: string; icon: Icon; rows: Row[] }

/**
 * Which columns win a row. Ties all win — declaring one of two identical values
 * "best" would be a lie. A row every column ties on marks nobody, since a tick
 * on every cell tells the reader nothing.
 */
function winnersOf(cols: Column[], best: (c: Column) => number | null): number[] {
  const scores = cols.map(best)
  const live = scores.filter((s): s is number => s != null)
  if (live.length < 2) return []
  const top = Math.max(...live)
  const won = scores.map((s, i) => (s === top ? i : -1)).filter((i) => i >= 0)
  return won.length === cols.length ? [] : won
}

/**
 * Price is only comparable within one unit — "₹95 L total" against
 * "₹35,000/mo" has no winner, and picking one would be actively misleading.
 */
function comparablePrices(cols: Column[]): boolean {
  return new Set(cols.map((c) => c.card.priceUnit)).size === 1
}

function ratePerSqft(c: Column): number | null {
  const { price, priceUnit, areaSqft } = c.card
  if (priceUnit === 'PER_SQFT') return price
  if (priceUnit !== 'TOTAL' || !areaSqft) return null
  return Math.round(price / areaSqft)
}

const num = (n: number | null | undefined) => (n == null ? DASH : String(n))

function buildGroups(cols: Column[]): Group[] {
  const priceComparable = comparablePrices(cols)
  // Land rows are noise on a flat; only show them when a plot or farm is in play.
  const anyLand = cols.some((c) =>
    c.card.propertyType === 'PLOT' || c.detail?.plotAreaCents != null || c.detail?.roadWidthFt != null)

  const groups: Group[] = [
    {
      title: 'Price', icon: 'pricetag-outline',
      rows: [
        { label: 'Price', strong: true,
          value: (c) => formatPrice(c.card.price, c.card.priceUnit),
          // Cheaper wins — negate.
          best: priceComparable ? (c) => -c.card.price : undefined },
        { label: 'Price type', value: (c) => priceTypeLabel(c.card.priceUnit, c.card.priceNegotiable) },
        { label: 'Rate', value: (c) => { const r = ratePerSqft(c); return r == null ? DASH : `₹${r.toLocaleString('en-IN')} / sq.ft` },
          best: (c) => { const r = ratePerSqft(c); return r == null ? null : -r } },
        { label: 'Deposit', value: (c) => c.detail?.securityDeposit != null ? formatPrice(c.detail.securityDeposit, 'TOTAL') : DASH },
      ],
    },
    {
      title: 'Size & layout', icon: 'resize-outline',
      rows: [
        { label: 'Built-up area', value: (c) => `${c.card.areaSqft.toLocaleString('en-IN')} sq.ft`,
          best: (c) => c.card.areaSqft || null },
        { label: 'Carpet area', value: (c) => c.detail?.carpetAreaSqft != null ? `${c.detail.carpetAreaSqft.toLocaleString('en-IN')} sq.ft` : DASH,
          best: (c) => c.detail?.carpetAreaSqft ?? null },
        { label: 'Bedrooms', value: (c) => c.card.bedrooms ? `${c.card.bedrooms} BHK` : DASH,
          best: (c) => c.card.bedrooms ?? null },
        { label: 'Bathrooms', value: (c) => num(c.card.bathrooms), best: (c) => c.card.bathrooms ?? null },
        { label: 'Balconies', value: (c) => num(c.detail?.balconies), best: (c) => c.detail?.balconies ?? null },
        { label: 'Floor', value: (c) => floorLabel(c) },
        { label: 'Parking', value: (c) => c.detail ? parkingLabel(c.detail.parkingCount, c.detail.parkingAvailable) : num(c.card.parkingCount),
          best: (c) => c.card.parkingCount ?? c.detail?.parkingCount ?? null },
      ],
    },
    {
      title: 'Property', icon: 'home-outline',
      rows: [
        { label: 'Type', value: (c) => prettyEnum(c.card.propertyType) },
        { label: 'Listing', value: (c) => listingTypeLabel(c.card.listingType) },
        { label: 'Furnishing', value: (c) => prettyEnum(c.card.furnishing) },
        { label: 'Facing', value: (c) => c.detail?.facing ? prettyEnum(c.detail.facing) : DASH },
        { label: 'Possession', value: (c) => possessionLabel(c.detail?.possessionStatus) ?? DASH },
        // Newer wins, but only among listings that actually stated an age.
        { label: 'Age', value: (c) => c.detail?.ageOfProperty != null ? `${c.detail.ageOfProperty} yrs` : DASH,
          best: (c) => c.detail?.ageOfProperty != null ? -c.detail.ageOfProperty : null },
        { label: 'Ownership', value: (c) => c.detail?.ownershipType ? prettyEnum(c.detail.ownershipType) : DASH },
        { label: 'Approval', value: (c) => c.detail ? approvalShort(c.detail.approvalAuthority) : DASH },
      ],
    },
    {
      title: 'Location', icon: 'location-outline',
      rows: [
        { label: 'Locality', value: (c) => c.card.localityName },
        { label: 'City', value: (c) => c.card.cityName },
        { label: 'Pincode', value: (c) => c.detail?.pincode ?? DASH },
      ],
    },
  ]

  if (anyLand) {
    groups.push({
      title: 'Land', icon: 'map-outline',
      rows: [
        { label: 'Plot size', value: (c) => c.detail?.plotLengthFt && c.detail?.plotBreadthFt ? `${c.detail.plotLengthFt} × ${c.detail.plotBreadthFt} ft` : DASH },
        { label: 'Cents', value: (c) => c.detail?.plotAreaCents != null ? `${c.detail.plotAreaCents} cents` : DASH,
          best: (c) => c.detail?.plotAreaCents ?? null },
        { label: 'Road width', value: (c) => c.detail?.roadWidthFt != null ? `${c.detail.roadWidthFt} ft` : DASH,
          best: (c) => c.detail?.roadWidthFt ?? null },
        { label: 'Corner plot', value: (c) => yesNo(c.detail?.cornerPlot) },
        { label: 'Boundary wall', value: (c) => yesNo(c.detail?.boundaryWall) },
      ],
    })
  }

  groups.push({
    title: 'Listing', icon: 'document-text-outline',
    rows: [
      { label: 'Reference', value: (c) => c.detail?.referenceCode ?? DASH },
      { label: 'Listed by', value: (c) => c.detail?.listedBy ? prettyEnum(c.detail.listedBy) : DASH },
      { label: 'Verified', value: (c) => (c.card.isVerified ? 'Yes' : 'No'), best: (c) => (c.card.isVerified ? 1 : 0) },
      { label: 'Featured', value: (c) => (c.card.isFeatured ? 'Yes' : 'No') },
      { label: 'Photos', value: (c) => String(c.card.imageCount), best: (c) => c.card.imageCount || null },
      { label: 'Views', value: (c) => c.card.viewsCount.toLocaleString('en-IN') },
    ],
  })

  return groups
}

function floorLabel(c: Column): string {
  const f = c.detail?.floorNumber
  const t = c.detail?.totalFloors
  if (f == null && t == null) return DASH
  if (f != null && t != null) return `${f} of ${t}`
  return f != null ? String(f) : `${t} floors`
}

function yesNo(v: boolean | null | undefined): string {
  return v == null ? DASH : v ? 'Yes' : 'No'
}

/** Union of amenity names across every column that loaded, alphabetical. */
function amenityNames(cols: Column[]): string[] {
  const set = new Set<string>()
  cols.forEach((c) => c.detail?.amenities?.forEach((a) => set.add(a.name)))
  return [...set].sort((a, b) => a.localeCompare(b))
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: BRAND },
  headerTitle: { ...typography.screenTitle, color: colors.white },
  headerSub:   { ...typography.body, color: 'rgba(255,255,255,0.82)', marginTop: 2 },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  emptySub:   { ...typography.body, marginTop: 6, textAlign: 'center' },
  cta:        { marginTop: 18, backgroundColor: BRAND, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.sm },
  ctaText:    { ...typography.button },

  loadingNote: { ...typography.caption, textAlign: 'center', marginTop: 12 },

  // One card holding the whole grid, so the zebra rows and the group bands are
  // clipped to the rounded corners instead of painting square edges over them.
  table:      { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },

  headRow:      { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.brandTint },
  headLabelCell:{ justifyContent: 'center', gap: 4 },
  headLabelText:{ fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15, color: BRAND },
  legendRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendText:   { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, color: colors.muted },
  headCell:     { paddingHorizontal: 12, paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(24,74,69,0.10)' },
  thumbWrap:    { position: 'relative' },
  thumb:        { width: '100%', height: 78, borderRadius: radius.sm, backgroundColor: colors.border },
  thumbEmpty:   { alignItems: 'center', justifyContent: 'center' },
  verifiedDot:  { position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  headTitle:    { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.ink, marginTop: 8 },
  headPrice:    { fontFamily: fonts.extra, fontSize: 15, lineHeight: 20, color: BRAND, marginTop: 3 },
  headLink:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  headLinkText: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, color: BRAND },

  // Group bands break the table into readable blocks — 30-odd undifferentiated
  // rows is what made the first version read as a wall.
  groupRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F1EFE8', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderLight },
  groupText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, color: BRAND, letterSpacing: 0.4, textTransform: 'uppercase' },

  // Rows are flex rows of fixed-width cells: that is what keeps every column
  // aligned without measuring anything, and it is why cells clamp their text.
  row:        { flexDirection: 'row', alignItems: 'stretch' },
  rowAlt:     { backgroundColor: '#FBFAF7' },

  labelCell:  { width: LABEL_W, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  labelText:  { ...typography.caption, fontSize: 11.5, lineHeight: 16 },

  cell:       { justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 11, borderLeftWidth: 1, borderLeftColor: colors.borderLight },
  cellInner:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cellBest:   { backgroundColor: 'rgba(22,163,74,0.07)' },
  valueText:  { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.ink, flexShrink: 1 },
  valueStrong:{ fontFamily: fonts.extra, fontSize: 15, lineHeight: 20, color: BRAND },
  valueBest:  { fontFamily: fonts.bold },
})
