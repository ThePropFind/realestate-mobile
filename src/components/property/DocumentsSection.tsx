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
 * Every tick on this screen is the LISTING-level `isVerified` flag. There is no
 * per-document verification column, so the per-row tick is only ever rendered when
 * the whole listing is verified, and the sentence above the rows always states
 * that scope. A row is never marked "unverified" on its own — that would invent a
 * per-document status the data does not have.
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
      <View style={styles.status}>
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
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>{DOC_LABELS[d.docType] ?? 'Document'}</Text>
            {d.label ? <Text style={styles.sub} numberOfLines={1}>{d.label}</Text> : null}
          </View>
          {isVerified ? (
            <View
              style={styles.tick}
              accessibilityLabel="This listing's documents were verified by PropFind"
            >
              <Ionicons name="checkmark-circle" size={13} color={colors.brand} />
              <Text style={styles.tickText}>Verified</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  // A quiet line with a rule under it, not a filled chip — the chip read as a
  // badge on the section rather than a statement about it.
  status: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: spacing.sm, marginBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  statusText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, flex: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1, minWidth: 0 },
  tick: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 3 },
  tickText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.brand },
  iconWrap: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  sub:  { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.muted },
})
