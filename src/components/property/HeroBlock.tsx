import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import { formatPrice } from '../../lib/format'
import type { PropertyDetail } from '../../types'

/** ② Badges · title · location · price. */
export function HeroBlock({ data }: { data: PropertyDetail }) {
  const hasApproval =
    data.approvalAuthority != null && data.approvalAuthority !== 'NONE' && data.approvalAuthority !== 'OTHER'

  return (
    <View style={styles.wrap}>
      <View style={styles.badges}>
        {/* isVerified is set by an admin after reviewing the uploaded documents —
            it is the only listing-level verification signal that exists. */}
        {data.isVerified ? (
          <Badge icon="shield-checkmark" label="Verified" tint={colors.brand} bg={colors.brandTint} border="#d3ddc9" />
        ) : null}
        {data.isFeatured ? (
          <Badge icon="star" label="Featured" tint={colors.accent} bg="#f9f3e8" border="#e5d3ac" />
        ) : null}
        {data.priceNegotiable ? (
          <Badge label="Negotiable" tint={colors.brand} bg={colors.brandTint} border="#d3ddc9" />
        ) : null}
        {hasApproval ? (
          <Badge label={`${data.approvalAuthority} Approved`} tint={colors.brand} bg={colors.brandTint} border="#d3ddc9" />
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={3}>{data.title}</Text>

      <View style={styles.locRow}>
        <Ionicons name="location" size={14} color={colors.muted} />
        <Text style={styles.location} numberOfLines={1}>
          {data.localityName}, {data.cityName}
        </Text>
      </View>

      <Text style={styles.price}>{formatPrice(data.price, data.priceUnit)}</Text>
      {data.securityDeposit != null && data.listingType !== 'SALE' ? (
        <Text style={styles.sub}>
          Security deposit ₹{data.securityDeposit.toLocaleString('en-IN')}
        </Text>
      ) : data.areaSqft ? (
        <Text style={styles.sub}>
          ₹{Math.round(data.price / data.areaSqft).toLocaleString('en-IN')} per sq.ft
        </Text>
      ) : null}
    </View>
  )
}

function Badge({
  icon, label, tint, bg, border,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name']
  label: string; tint: string; bg: string; border: string
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      {icon ? <Ionicons name={icon} size={11} color={tint} /> : null}
      <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1,
  },
  // Fixed-height pill — explicit lineHeight (includeFontPadding is off app-wide).
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },

  title:    { fontFamily: fonts.display, fontSize: 22, lineHeight: 30, color: colors.ink },
  locRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  location: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted, flex: 1 },
  price:    { fontFamily: fonts.display, fontSize: 26, lineHeight: 34, color: colors.brand, marginTop: spacing.md },
  sub:      { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
})
