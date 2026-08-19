import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, shadow, spacing } from '../../theme'

/**
 * Sticky Call · WhatsApp · Book Visit bar.
 *
 * All three actions already worked before the redesign and are wired unchanged —
 * the handlers stay on the screen so the tel:/wa.me phone normalisation and the
 * booking sheet keep a single owner.
 */
export function StickyActionBar({
  bottomInset, onCall, onWhatsApp, onBookVisit,
}: {
  bottomInset: number
  onCall: () => void
  onWhatsApp: () => void
  onBookVisit: () => void
}) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
      <Pressable onPress={onCall} style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
        <Ionicons name="call" size={16} color={colors.brand} />
        <Text style={[styles.label, { color: colors.brand }]}>Call</Text>
      </Pressable>
      <Pressable onPress={onWhatsApp} style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
        <Ionicons name="logo-whatsapp" size={16} color={colors.brand} />
        <Text style={[styles.label, { color: colors.brand }]}>WhatsApp</Text>
      </Pressable>
      <Pressable onPress={onBookVisit} style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}>
        <Ionicons name="calendar" size={16} color={colors.white} />
        <Text style={[styles.label, { color: colors.white }]}>Book Visit</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    ...shadow.raised,
  },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13, borderRadius: radius.sm,
  },
  outline: { borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.white },
  primary: { backgroundColor: colors.brand, flex: 1.2 },
  pressed: { opacity: 0.85 },
  // Fixed-height button — explicit lineHeight (includeFontPadding is off app-wide).
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
})
