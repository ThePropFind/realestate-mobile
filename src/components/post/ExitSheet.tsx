import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { DraggableSheet, SheetGrabZone } from '../DraggableSheet'
import { colors, fonts, radius, typography } from '../../theme'

const BRAND = colors.brand

/**
 * Leaving the wizard has three answers, not two — ConfirmSheet only offers two.
 * "Save & exit" is the default because the flow promises a resumable draft, and
 * discarding is the destructive one that has to be chosen deliberately.
 */
export function ExitSheet({
  visible, onClose, onSaveExit, onDiscard, canSave,
}: {
  visible: boolean
  onClose: () => void
  onSaveExit: () => void
  onDiscard: () => void
  /** Nothing filled in yet — offering to save an empty draft is noise. */
  canSave: boolean
}) {
  return (
    <DraggableSheet visible={visible} onClose={onClose} contentStyle={styles.sheet} dragAnywhere>
      <SheetGrabZone>
        <View style={styles.iconWrap}>
          <Ionicons name="exit-outline" size={24} color={BRAND} />
        </View>
        <Text style={styles.title}>Leave this listing?</Text>
        <Text style={styles.body}>
          {canSave
            ? 'Save it as a draft and pick up exactly where you left off.'
            : 'Nothing has been filled in yet, so there is nothing to save.'}
        </Text>
      </SheetGrabZone>

      {canSave ? (
        <Pressable onPress={onSaveExit} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}>
          <Ionicons name="save-outline" size={17} color="#fff" />
          <Text style={styles.primaryText}>Save draft & exit</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={onDiscard} style={({ pressed }) => [styles.danger, pressed && { opacity: 0.9 }]}>
        <Text style={styles.dangerText}>{canSave ? 'Discard listing' : 'Leave'}</Text>
      </Pressable>

      <Pressable onPress={onClose} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}>
        <Text style={styles.ghostText}>Keep editing</Text>
      </Pressable>
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  sheet:       { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'stretch' },
  iconWrap:    { alignSelf: 'center', width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandTint, borderWidth: 1, borderColor: '#d3ddc9', alignItems: 'center', justifyContent: 'center' },
  title:       { ...typography.title, textAlign: 'center', marginTop: 12 },
  body:        { ...typography.body, textAlign: 'center', marginTop: 6, marginBottom: 18 },

  primary:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, borderRadius: radius.sm, paddingVertical: 15 },
  primaryText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: '#fff' },
  danger:      { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingVertical: 15, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', marginTop: 10 },
  dangerText:  { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.danger },
  ghost:       { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  ghostText:   { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.muted },
})
