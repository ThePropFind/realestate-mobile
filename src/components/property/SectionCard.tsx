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
  title, action, children, style,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  style?: ViewStyle
}) {
  return (
    <View style={[styles.card, style]}>
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
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  // Playfair is a display face — section titles are a display slot.
  // Explicit lineHeight: includeFontPadding is off app-wide, so tall Playfair
  // ascenders would otherwise clip inside this row.
  title: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 24, color: colors.ink },
})
