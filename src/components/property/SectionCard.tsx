import { StyleSheet, View, type ViewStyle } from 'react-native'
import { Text } from '../Text'
import { colors, fonts, radius, shadow, spacing } from '../../theme'

/**
 * The white rounded card every detail section sits in.
 *
 * The old screen gave each section its own padded <View> with a hairline rule, so
 * spacing drifted section to section. One shell means the rhythm is defined once.
 * `action` is the optional right-aligned link ("View on Map", "View All").
 */
export function SectionCard({
  title, action, children, style, flush = false,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  style?: ViewStyle
  /**
   * Full-bleed: no side margin, radius, border or shadow — the section becomes a
   * band in one continuous white sheet instead of a card floating on the ivory bg.
   * The property detail screen uses this; `app/users/[id].tsx` does NOT, because it
   * derives its grid width from the default card's margin + padding (see CARD_WIDTH
   * there). Changing the defaults instead of adding this variant would break it.
   */
  flush?: boolean
}) {
  return (
    <View style={[styles.card, flush && styles.flush, style]}>
      {title ? (
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  flush: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowOpacity: 0, elevation: 0,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  // Explicit lineHeight: includeFontPadding is off app-wide, so tall ascenders
  // would otherwise clip inside this fixed row.
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: colors.ink },
})
