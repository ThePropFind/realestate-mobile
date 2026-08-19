import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import type { PropertyDocument } from '../../types'

const DOC_LABELS: Record<PropertyDocument['docType'], string> = {
  FMB_SKETCH:      'FMB Sketch',
  EC:              'Encumbrance Certificate',
  PATTA:           'Patta',
  APPROVAL_LETTER: 'Approval Letter',
  OTHER:           'Other Document',
}

/**
 * ⑨ Documents & approvals — which papers exist, never a link to one.
 *
 * The public detail endpoint returns DocumentSummaryResponse, which has no url
 * field at all; verification documents hold owner PII (survey numbers, EC entries,
 * patta records), live in a private bucket, and are readable only through an admin
 * presigned download. This section must never grow a tap target — that is the
 * regression #31 / #43 failure mode.
 *
 * The tick is the LISTING-level `isVerified` flag, shown once above the rows.
 * There is no per-document verification column, so a tick per row would be a
 * trust signal the data does not support.
 */
export function DocumentsSection({
  documents, isVerified,
}: {
  documents: PropertyDocument[]
  isVerified: boolean
}) {
  if (!documents.length) return null

  return (
    <View>
      <View style={[styles.status, isVerified ? styles.statusOn : styles.statusOff]}>
        <Ionicons
          name={isVerified ? 'shield-checkmark' : 'time-outline'}
          size={14}
          color={isVerified ? colors.brand : colors.warning}
        />
        <Text style={[styles.statusText, { color: isVerified ? colors.brand : colors.warning }]}>
          {isVerified
            ? 'Documents reviewed and verified by PropFind'
            : 'Uploaded by the owner — not yet verified by PropFind'}
        </Text>
      </View>

      {documents.map((d, i) => (
        <View key={`${d.docType}-${i}`} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={16} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{DOC_LABELS[d.docType] ?? 'Document'}</Text>
            {d.label ? <Text style={styles.sub} numberOfLines={1}>{d.label}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm, marginBottom: spacing.md,
  },
  statusOn:  { backgroundColor: colors.brandTint },
  statusOff: { backgroundColor: '#fdf6e9' },
  statusText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, flex: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  iconWrap: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  sub:  { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.muted },
})
