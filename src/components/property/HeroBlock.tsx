import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import { formatPrice, priceTypeLabel } from '../../lib/format'
import type { PropertyDetail } from '../../types'

/**
 * ② Badges · title · location · price. The screen wraps this in a title-less
 * <SectionCard>, so it carries no padding of its own — adding any doubles it.
 */
export function HeroBlock({ data }: { data: PropertyDetail }) {
  const hasApproval =
    data.approvalAuthority != null && data.approvalAuthority !== 'NONE' && data.approvalAuthority !== 'OTHER'

  // An empty badge row still reserves its marginBottom, leaving a phantom gap
  // above the title — so it is not rendered at all when nothing qualifies.
  const hasBadges = data.isVerified || data.isFeatured || data.priceNegotiable || hasApproval

  return (
    <View>
      {hasBadges ? (
        <View style={styles.badges}>
          {/* isVerified is set by an admin after reviewing the uploaded documents —
              it is the only listing-level verification signal that exists. */}
          {data.isVerified ? (
            <Badge icon="checkmark-circle" label="Verified" tint={colors.brand} />
          ) : null}
          {data.isFeatured ? (
            <Badge icon="star" label="Featured" tint={colors.accent} />
          ) : null}
          {data.priceNegotiable ? (
            <Badge icon="pricetag-outline" label="Negotiable" tint={colors.brand} />
          ) : null}
          {hasApproval ? (
            <Badge label={`${data.approvalAuthority} Approved`} tint={colors.brand} />
          ) : null}
        </View>
      ) : null}

      <Text style={styles.title} numberOfLines={3}>{data.title}</Text>

      <View style={styles.locRow}>
        <Ionicons name="location" size={14} color={colors.muted} />
        <Text style={styles.location} numberOfLines={1}>
          {[data.localityName, data.cityName, data.cityState].filter(Boolean).join(', ')}
        </Text>
      </View>

      <Text style={styles.price}>{formatPrice(data.price, data.priceUnit)}</Text>
      <Text style={styles.sub}>{priceTypeLabel(data.priceUnit, data.priceNegotiable)}</Text>
      {/* The only place in the app that surfaces the deposit — it is a second
          line, not an alternative to the price type label. */}
      {data.securityDeposit != null && data.listingType !== 'SALE' ? (
        <Text style={styles.deposit}>
          Security deposit ₹{data.securityDeposit.toLocaleString('en-IN')}
        </Text>
      ) : null}
    </View>
  )
}

/** Outlined pill: white fill, border in the same tint as the text. */
function Badge({
  icon, label, tint,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name']
  label: string; tint: string
}) {
  return (
    <View style={[styles.badge, { borderColor: tint }]}>
      {icon ? <Ionicons name={icon} size={11} color={tint} /> : null}
      <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1,
    backgroundColor: colors.white,
  },
  // Fixed-height pill — explicit lineHeight (includeFontPadding is off app-wide).
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },

  title:    { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, color: colors.ink },
  locRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  location: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted, flex: 1 },
  price:    { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, color: colors.brand, marginTop: spacing.md },
  sub:      { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
  deposit:  { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.mutedLight, marginTop: 2 },
})
