import { Pressable, StyleSheet, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { appAlert } from '../AppAlert'
import { StepHeading } from './fields'
import { colors, fonts, radius, typography } from '../../theme'
import { docSlotsFor, type DocSlot, type WizardState } from '../../lib/postWizard'

const BRAND = colors.brand
/** Backend rejects anything larger (StorageService MAX_DOC_SIZE); catching it here saves a failed upload at submit. */
const MAX_DOC_BYTES = 15 * 1024 * 1024

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

/** Step 7 — optional paperwork that earns the Verified badge. */
export function StepDocuments({ state, set }: { state: WizardState; set: Setter }) {
  const slots = docSlotsFor(state)

  const pick = async (slot: DocSlot) => {
    const meta = slots.find((s) => s.slot === slot)
    if (!meta) return
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    })
    if (res.canceled || !res.assets?.length) return
    const a = res.assets[0]
    if (a.size != null && a.size > MAX_DOC_BYTES) {
      appAlert('File too large', 'Documents must be under 15 MB. Try a compressed PDF or a photo of the page.')
      return
    }
    const next = state.documents.filter((d) => d.slot !== slot)
    next.push({
      uri: a.uri,
      name: a.name || `${slot.toLowerCase()}.pdf`,
      type: a.mimeType || 'application/octet-stream',
      slot,
      docType: meta.docType,
      label: meta.label,
    })
    set('documents', next)
  }

  const remove = (slot: DocSlot) => set('documents', state.documents.filter((d) => d.slot !== slot))

  return (
    <View>
      <StepHeading
        title="Documents & verification"
        subtitle="Optional. Uploading these gets your listing a Verified badge faster."
      />

      <View style={styles.notice}>
        <Ionicons name="lock-closed-outline" size={16} color={BRAND} />
        <Text style={styles.noticeText}>
          Documents are private. Only the PropFind review team can open them — they are never shown to buyers.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {slots.map((d) => {
          const existing = state.documents.find((x) => x.slot === d.slot)
          return (
            <View key={d.slot} style={[styles.card, existing && styles.cardOn]}>
              <Ionicons
                name={existing ? 'checkmark-circle' : 'document-text-outline'}
                size={22}
                color={existing ? colors.success : BRAND}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{d.label}</Text>
                <Text style={styles.sub} numberOfLines={1}>{existing ? existing.name : d.hint}</Text>
              </View>
              {existing ? (
                <Pressable onPress={() => remove(d.slot)} hitSlop={8} accessibilityLabel={`Remove ${d.label}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => pick(d.slot)}
                  style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Upload ${d.label}`}
                >
                  <Text style={styles.uploadText}>Upload</Text>
                </Pressable>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  notice:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.brandTint, borderRadius: radius.sm, padding: 12, marginBottom: 16 },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.brand },

  card:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  cardOn:     { borderColor: colors.success, backgroundColor: '#f0fdf4' },
  title:      { ...typography.cardTitle, fontSize: 14 },
  sub:        { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
  uploadBtn:  { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
  uploadText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: BRAND },
})
