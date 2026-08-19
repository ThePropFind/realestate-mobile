import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'

const TIPS = [
  'Never pay an advance or token amount before visiting the property in person.',
  'Verify the original documents — patta, EC and approval — before any payment.',
  'PropFind never asks for money on behalf of an owner or agent.',
]

/**
 * ⑩ Safety & reporting.
 *
 * The tips are deliberately generic anti-fraud advice, not claims about this
 * listing — the platform cannot vouch for a seller it has not met.
 */
export function SafetySection({ onReport }: { onReport: () => void }) {
  return (
    <View>
      {TIPS.map((tip) => (
        <View key={tip} style={styles.tipRow}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.brand} style={styles.tipIcon} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}

      <Pressable
        onPress={onReport}
        style={({ pressed }) => [styles.reportBtn, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="flag-outline" size={15} color={colors.danger} />
        <Text style={styles.reportText}>Report this listing</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 6 },
  tipIcon: { marginTop: 2 },
  tipText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, flex: 1 },

  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: spacing.md, paddingVertical: 11,
    borderRadius: radius.sm, borderWidth: 1, borderColor: '#f3d3d3', backgroundColor: '#fdf3f3',
  },
  reportText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.danger },
})
