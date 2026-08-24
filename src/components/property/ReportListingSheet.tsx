import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, TextInput } from '../Text'
import { DraggableSheet, SheetGrabZone } from '../DraggableSheet'
import { PrimaryButton } from '../PrimaryButton'
import { appAlert } from '../AppAlert'
import { propertyApi } from '../../lib/api'
import { colors, fonts, radius, spacing, typography } from '../../theme'
import type { ReportReason } from '../../types'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'FRAUD_OR_SCAM',          label: 'Fraud or scam' },
  { value: 'ALREADY_SOLD_OR_RENTED', label: 'Already sold / rented' },
  { value: 'INCORRECT_INFO',         label: 'Wrong information' },
  { value: 'DUPLICATE_LISTING',      label: 'Duplicate listing' },
  { value: 'OFFENSIVE_CONTENT',      label: 'Offensive content' },
  { value: 'OTHER',                  label: 'Something else' },
]

/**
 * ⑩ Report sheet. Posts to the public reports endpoint, which accepts guest
 * reports — no sign-in gate here on purpose: requiring an account to flag a scam
 * would mean the listings most worth flagging get flagged least.
 *
 * On DraggableSheet rather than a raw Modal, per the repo's sheet convention.
 */
export function ReportListingSheet({
  visible, onClose, propertyId,
}: {
  visible: boolean
  onClose: () => void
  propertyId: string
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  // Reopening after a submit must not show the previous report's selection.
  useEffect(() => {
    if (visible) { setReason(null); setDetails(''); setSending(false) }
  }, [visible])

  const submit = async () => {
    if (!reason) return appAlert('Pick a reason', 'Tell us what is wrong with this listing.')
    setSending(true)
    try {
      await propertyApi.report(propertyId, { reason, details: details.trim() || undefined })
      onClose()
      appAlert('Report sent', 'Thanks — our team will review this listing.')
    } catch (e: unknown) {
      appAlert('Could not send', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <DraggableSheet visible={visible} onClose={onClose} contentStyle={styles.sheet}>
      <SheetGrabZone>
        <View style={styles.head}>
          <View style={styles.headIcon}>
            <Ionicons name="flag-outline" size={18} color={colors.danger} />
          </View>
          <Text style={styles.title}>Report this listing</Text>
        </View>
        <Text style={styles.sub}>
          Tell us what is wrong. Reports are reviewed by our team — the owner is not told who reported.
        </Text>
      </SheetGrabZone>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <View style={styles.chips}>
          {REASONS.map((r) => {
            const on = reason === r.value
            return (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{r.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.fieldLabel}>More details (optional)</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="What did you notice?"
          placeholderTextColor={colors.mutedLight}
          multiline
          numberOfLines={4}
          maxLength={1000}
          style={styles.input}
        />

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton label="Send report" onPress={submit} loading={sending} disabled={!reason} />
        </View>
      </ScrollView>
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headIcon: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: '#fdf3f3', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, color: colors.ink },
  sub:   { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: spacing.sm },
  scroll: { marginTop: spacing.lg },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 9,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.brandTint, borderColor: colors.brand },
  chipText:   { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  chipTextOn: { fontFamily: fonts.semibold, color: colors.brand },

  fieldLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.ink, marginTop: spacing.lg, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.input, fontFamily: fonts.regular, lineHeight: 19,
    minHeight: 88, textAlignVertical: 'top',
  },
})
