import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, shadow, spacing } from '../../theme'

/**
 * Back · Favourite · Share, floating over the gallery.
 *
 * The heart is controlled — the screen owns the optimistic toggle and its revert,
 * so this component never guesses at saved state.
 */
export function FloatingHeader({
  top, liked, onBack, onShare, onToggleLike,
}: {
  top: number
  liked: boolean
  onBack: () => void
  onShare: () => void
  onToggleLike: () => void
}) {
  return (
    <View style={[styles.bar, { top: top + spacing.sm }]} pointerEvents="box-none">
      <RoundButton icon="arrow-back" onPress={onBack} label="Go back" />
      <View style={styles.right}>
        <RoundButton
          icon={liked ? 'heart' : 'heart-outline'}
          tint={liked ? colors.accent : colors.ink}
          onPress={onToggleLike}
          label={liked ? 'Remove from saved' : 'Save this listing'}
        />
        <RoundButton icon="share-social-outline" onPress={onShare} label="Share this listing" />
      </View>
    </View>
  )
}

function RoundButton({
  icon, onPress, label, tint = colors.ink,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  onPress: () => void
  label: string
  tint?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}
    >
      <Ionicons name={icon} size={20} color={tint} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  right: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    width: 38, height: 38, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.card,
  },
})
