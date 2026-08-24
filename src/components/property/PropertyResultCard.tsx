import { Dimensions, Image, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../Text'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, prettyEnum } from '../../lib/format'
import { colors, fonts, radius, shadow } from '../../theme'
import type { PropertyCard } from '../../types'

const BRAND = colors.brand
const ACCENT = colors.accent

// Photo panel ≈ the mock's 36% of the screen. What is left over has to hold the
// Call / WhatsApp / View Details row, which is why that row's type is this small.
const IMAGE_W = Math.min(165, Math.max(130, Math.round(Dimensions.get('window').width * 0.36)))

interface Props {
  item: PropertyCard
  saved: boolean
  onToggleSave: (id: string) => void
  onPress: () => void
  /**
   * Omit to drop the Call / WhatsApp links. Saved passes nothing: you already
   * decided you like these, and the card is a way back to them, not a pitch.
   * "View Details" survives either way, so the action row never renders empty.
   */
  onContact?: (item: PropertyCard, mode: 'call' | 'whatsapp') => void
  /**
   * Selection mode, for Saved's compare picker. `selected` undefined means the
   * card is not selectable and no checkbox is drawn at all.
   */
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

/**
 * The listing card used by the Search results list and the Saved tab.
 *
 * It began as a private `Row` inside `app/(tabs)/search.tsx`; Saved was
 * rebuilt on the same card rather than growing a second one, so this moved out
 * here. Everything that differs between the two screens is a prop — there are
 * no screen-specific branches inside.
 */
export function PropertyResultCard({
  item, saved, onToggleSave, onPress, onContact, selected, onToggleSelect,
}: Props) {
  const selectable = selected !== undefined && onToggleSelect !== undefined

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.cardImageWrap}>
        {item.primaryImageUrl ? (
          <Image source={{ uri: item.primaryImageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.noImage]}><Ionicons name="image-outline" size={28} color={colors.mutedLight} /></View>
        )}
        {item.isFeatured ? (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        ) : null}
        <Pressable onPress={() => onToggleSave(item.id)} hitSlop={8} style={({ pressed }) => [styles.heart, pressed && { opacity: 0.8 }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? ACCENT : colors.muted} />
        </Pressable>
        {/* Bottom-left of the photo — the one corner the Featured badge and the
            heart never claim, so the checkbox needs no layout of its own. */}
        {selectable ? (
          <Pressable
            onPress={() => onToggleSelect(item.id)}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Select ${item.title} to compare`}
            style={({ pressed }) => [styles.checkbox, selected && styles.checkboxOn, pressed && { opacity: 0.8 }]}
          >
            {selected ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.locRow}>
          <Ionicons name="location" size={12} color={colors.muted} />
          <Text style={styles.cardLoc} numberOfLines={1}>{item.localityName}, {item.cityName}</Text>
        </View>
        <Text style={styles.cardPrice}>{formatPrice(item.price, item.priceUnit)}</Text>

        <View style={styles.chipRow}>
          {item.isVerified ? (
            <View style={styles.chip}>
              <Ionicons name="shield-checkmark-outline" size={12} color={BRAND} />
              <Text style={styles.chipText}>Verified</Text>
            </View>
          ) : null}
          <View style={styles.chip}>
            <Ionicons name="checkmark-circle-outline" size={12} color={BRAND} />
            <Text style={styles.chipText}>{prettyEnum(item.propertyType)}</Text>
          </View>
        </View>

        {/* Specs, split by hairline dividers as in the mock */}
        <View style={styles.specRow}>
          {specsOf(item).map((s, i) => (
            <View key={s.label} style={styles.specCell}>
              {i > 0 ? <View style={styles.specDivider} /> : null}
              <Ionicons name={s.icon} size={14} color={colors.muted} />
              <Text style={styles.specText} numberOfLines={1}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions sit in the body column, right of the photo, as in the mock —
            which only fits at this type size. Labels shrink before overflowing. */}
        <View style={styles.actionRow}>
          {onContact ? (
            <>
              <Pressable onPress={() => onContact(item, 'call')} hitSlop={10} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="call" size={12} color={BRAND} />
                <Text style={styles.linkText} numberOfLines={1}>Call</Text>
              </Pressable>
              <Pressable onPress={() => onContact(item, 'whatsapp')} hitSlop={10} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="logo-whatsapp" size={12} color={colors.success} />
                <Text style={[styles.linkText, { color: colors.success }]} numberOfLines={1}>WhatsApp</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={onPress} style={({ pressed }) => [styles.detailBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.detailBtnText} numberOfLines={1}>View Details</Text>
            <Ionicons name="arrow-forward" size={10} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}

/** The mock's spec strip: beds · area · baths, whichever the listing has. */
function specsOf(item: PropertyCard): { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] {
  const specs: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = []
  if (item.bedrooms)  specs.push({ icon: 'bed-outline',   label: `${item.bedrooms} BHK` })
  specs.push({ icon: 'scan-outline', label: `${item.areaSqft} sq.ft` })
  if (item.bathrooms) specs.push({ icon: 'water-outline', label: String(item.bathrooms) })
  return specs
}

const styles = StyleSheet.create({
  // Card — photo panel on the left, rounded on all four corners so the white
  // card peeks out behind it as in the mock. `overflow: 'hidden'` is the hard
  // stop that keeps the action row from ever painting past the card edge.
  // Own horizontal margin — the list's contentContainer can't pad the cards now
  // that the search/tabs/sort header shares it.
  card:        { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden', ...shadow.card },
  cardImageWrap:{ width: IMAGE_W, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.border },
  cardImage:   { flex: 1, width: '100%' },
  noImage:     { alignItems: 'center', justifyContent: 'center' },
  featuredBadge:{ position: 'absolute', top: 9, left: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  featuredBadgeText: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13, color: '#fff' },
  heart:       { position: 'absolute', top: 9, right: 9, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
  checkbox:    { position: 'absolute', bottom: 9, left: 9, width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1.5, borderColor: colors.border },
  checkboxOn:  { backgroundColor: BRAND, borderColor: BRAND },

  cardBody:    { flex: 1, paddingVertical: 10, paddingHorizontal: 8, gap: 4 },
  cardTitle:   { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardLoc:     { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.muted, flexShrink: 1 },
  cardPrice:   { fontFamily: fonts.extra, fontSize: 18, lineHeight: 24, color: BRAND },

  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brandTint, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  chipText:    { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, color: BRAND },

  specRow:     { flexDirection: 'row', alignItems: 'center', paddingTop: 3 },
  specCell:    { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  specDivider: { width: 1, height: 14, backgroundColor: colors.border, marginHorizontal: 7 },
  specText:    { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.ink },

  // Sized so the three controls total ~180pt inside a ~204pt column: the slack
  // lands as visible air before the pill (marginLeft: 'auto'). Any larger type
  // here and they touch — the photo owns the rest of the card's width.
  actionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 8, marginTop: 3 },
  linkBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  linkText:    { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 12, color: BRAND },
  detailBtn:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: BRAND, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 6, marginLeft: 'auto', flexShrink: 0 },
  detailBtnText:{ fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 12, color: '#fff' },
})
