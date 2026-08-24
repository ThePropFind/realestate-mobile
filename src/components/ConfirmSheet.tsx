import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import { DraggableSheet } from './DraggableSheet'
import { colors, fonts, radius, typography } from '../theme'

const BRAND = colors.brand
const DANGER = colors.danger

export interface ConfirmSheetProps {
  visible: boolean
  onClose: () => void
  title: string
  body?: string
  icon?: React.ComponentProps<typeof Ionicons>['name']
  confirmLabel: string
  onConfirm: () => void
  cancelLabel?: string
  /** Tint the confirm button red for irreversible actions (discard, delete, cancel). */
  destructive?: boolean
}

/**
 * Branded confirmation bottom sheet — the app-styled replacement for the bare
 * native Alert.alert two-button dialogs (discard listing, sign out, cancel
 * booking…). Same look + drag-to-dismiss as InfoSheet / CityPickerSheet.
 */
export function ConfirmSheet({
  visible, onClose, title, body, icon, confirmLabel, onConfirm,
  cancelLabel = 'Cancel', destructive = false,
}: ConfirmSheetProps) {
  const accent = destructive ? DANGER : BRAND
  return (
    <DraggableSheet visible={visible} onClose={onClose} contentStyle={styles.sheet} dragAnywhere>
      <View style={[styles.iconWrap, { backgroundColor: destructive ? '#fef2f2' : colors.brandTint, borderColor: destructive ? '#fecaca' : '#d3ddc9' }]}>
        <Ionicons name={icon ?? (destructive ? 'alert-circle-outline' : 'help-circle-outline')} size={26} color={accent} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      {body ? <Text style={styles.body}>{body}</Text> : null}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
          onPress={onClose}>
          <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, { backgroundColor: accent }, pressed && { opacity: 0.85 }]}
          onPress={() => { onClose(); onConfirm() }}>
          <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  sheet:        { alignItems: 'center' },

  iconWrap:     { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 14 },
  title:        { fontFamily: fonts.extra, fontSize: 18, color: colors.ink, textAlign: 'center' },
  accentBar:    { width: 36, height: 3, borderRadius: 2, marginTop: 8, marginBottom: 10 },
  body:         { ...typography.body, textAlign: 'center', marginBottom: 20 },
  row:          { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, borderRadius: radius.sm, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: colors.white, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:{ ...typography.button, color: '#334155' },
  confirmBtn:   { flex: 1, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText:{ ...typography.button },
})
