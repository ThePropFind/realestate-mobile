import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'

/**
 * ⑩ Safety & reporting.
 *
 * The advice is deliberately generic anti-fraud guidance, not a claim about this
 * listing — the platform cannot vouch for a seller it has not met.
 *
 * The report control is grey, not danger red: a red button at the bottom of every
 * listing reads as an alarm and invites misfires from people who only meant to
 * scroll. It is a 44dp row so it is still comfortably tappable.
 */
export function SafetySection({ onReport }: { onReport: () => void }) {
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
        <Text style={styles.heading}>Stay safe</Text>
      </View>
      <Text style={styles.body}>
        Never pay an advance or token amount before visiting the property in person,
        and check the original patta, EC and approval papers before any payment.
        PropFind never asks for money on behalf of an owner or agent.
      </Text>

      <Pressable
        onPress={onReport}
        accessibilityRole="button"
        accessibilityLabel="Report this listing"
        style={({ pressed }) => [styles.reportRow, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="flag-outline" size={15} color={colors.muted} />
        <Text style={styles.reportText}>Report this listing</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.mutedLight} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm,
    backgroundColor: colors.bg, padding: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 6 },

  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    minHeight: 44, marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  reportText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.muted, flex: 1 },
})
