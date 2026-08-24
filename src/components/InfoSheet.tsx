import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import { DraggableSheet } from './DraggableSheet'
import { colors, fonts, radius, typography } from '../theme'

const BRAND = colors.brand
const ACCENT = colors.accent

export interface InfoSheetContent {
  icon?: React.ComponentProps<typeof Ionicons>['name']
  title: string
  body: string
  /** Optional secondary action under the body (e.g. deep-link to a live feature). */
  actionLabel?: string
  onAction?: () => void
}

/**
 * Branded bottom sheet for "coming soon" / informational messages —
 * replaces the bare Alert.alert boxes with the app's sheet style
 * (same look as CityPickerSheet).
 */
export function InfoSheet({
  visible, onClose, icon = 'rocket-outline', title, body, actionLabel, onAction,
}: InfoSheetContent & { visible: boolean; onClose: () => void }) {
  return (
    <DraggableSheet visible={visible} onClose={onClose} contentStyle={styles.sheet} dragAnywhere>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={ACCENT} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <View style={styles.accentBar} />
      <Text style={styles.body}>{body}</Text>

      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
          onPress={() => { onClose(); onAction() }}>
          <Text style={styles.secondaryBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        onPress={onClose}>
        <Text style={styles.primaryBtnText}>Got it</Text>
      </Pressable>
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  sheet:        { alignItems: 'center' },

  iconWrap:     { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandTint, borderWidth: 1, borderColor: '#d3ddc9', alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 14 },
  title:        { fontFamily: fonts.extra, fontSize: 18, color: colors.ink, textAlign: 'center' },
  accentBar:    { width: 36, height: 3, borderRadius: 2, backgroundColor: ACCENT, marginTop: 8, marginBottom: 10 },
  body:         { ...typography.body, textAlign: 'center', marginBottom: 20, paddingHorizontal: 4 },
  secondaryBtn: { alignSelf: 'stretch', borderRadius: radius.sm, borderWidth: 1, borderColor: '#d3ddc9', backgroundColor: colors.brandTint, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  secondaryBtnText: { ...typography.button, color: BRAND },
  primaryBtn:   { alignSelf: 'stretch', borderRadius: radius.sm, backgroundColor: BRAND, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { ...typography.button },
})
