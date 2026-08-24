import { Image, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { FieldError, StepHeading, useFieldError } from './fields'
import { colors, fonts, radius, shadow, typography } from '../../theme'
import { formatPrice } from '../../lib/format'
import {
  AREA_UNIT_LABELS, isBuilding, isPlotOrLand, isResidentialBuilding, isRental,
  propertyTypeLabel, toSqft, type WizardState,
} from '../../lib/postWizard'
import type { Locality } from '../../types'

const BRAND = colors.brand

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

/**
 * Step 8 — what the listing will look like, before it is real.
 *
 * The stat strip is built from whatever the listing type actually has, not a
 * fixed three columns: a plot has no bedrooms and a flat has no road width, and
 * printing "—" three times is worse than printing two honest facts.
 */
export function StepPreview({
  state, set, locality, onJumpToStep,
}: {
  state: WizardState
  set: Setter
  locality: Locality | null
  onJumpToStep: (step: number) => void
}) {
  const { error, onLayout } = useFieldError('acceptedTerms')
  const cover = state.images[0]
  const priceUnit = isRental(state) ? 'PER_MONTH' : 'TOTAL'
  const areaLabel = `${state.areaValue || '—'} ${AREA_UNIT_LABELS[state.areaUnit]}`
  const where = [locality?.name, state.cityName].filter(Boolean).join(', ')

  const stats: { label: string; value: string }[] = []
  stats.push({ label: 'Area', value: areaLabel })
  if (isResidentialBuilding(state) && state.bedrooms) stats.push({ label: 'Bedrooms', value: `${state.bedrooms} BHK` })
  if (isBuilding(state) && state.bathrooms) stats.push({ label: 'Bathrooms', value: state.bathrooms })
  if (isPlotOrLand(state) && state.roadWidthFt) stats.push({ label: 'Road width', value: `${state.roadWidthFt} ft` })
  const typeLabel = propertyTypeLabel(state)
  if (typeLabel) stats.push({ label: 'Type', value: typeLabel })

  const summary: { step: number; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [
    { step: 3, icon: 'document-text-outline', label: 'Details',   value: `${toSqft(state.areaValue, state.areaUnit).toLocaleString('en-IN')} sq.ft` },
    { step: 4, icon: 'location-outline',      label: 'Location',  value: where || 'Not set' },
    { step: 5, icon: 'sparkles-outline',      label: 'Features',  value: featureCount(state) },
    {
      step: 6, icon: 'images-outline', label: 'Photos & video',
      value: `${state.images.length} photo${state.images.length === 1 ? '' : 's'}${state.video ? ' + video' : ''}`,
    },
    { step: 7, icon: 'shield-checkmark-outline', label: 'Documents', value: `${state.documents.length} uploaded` },
  ]

  return (
    <View>
      <StepHeading title="Preview your listing" subtitle="This is what buyers will see. Tap any row to go back and edit." />

      <View style={styles.card}>
        <View style={styles.coverWrap}>
          {cover ? (
            <Image source={{ uri: cover.uri }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverEmpty]}>
              <Ionicons name="image-outline" size={26} color={colors.mutedLight} />
            </View>
          )}
          <View style={styles.coverTag}><Text style={styles.coverTagText}>Cover photo</Text></View>
          {state.images.length > 1 ? (
            <View style={styles.countTag}>
              <Ionicons name="images" size={11} color="#fff" />
              <Text style={styles.countTagText}>{state.images.length}</Text>
            </View>
          ) : null}
          {state.video ? (
            <View style={styles.videoTag}>
              <Ionicons name="play" size={11} color="#fff" />
              <Text style={styles.countTagText}>Video</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{state.title || 'Untitled listing'}</Text>
          {where ? (
            <View style={styles.whereRow}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={styles.where} numberOfLines={1}>{where}</Text>
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {state.price ? formatPrice(Number(state.price), priceUnit) : '—'}
            </Text>
            {state.priceNegotiable ? <Text style={styles.negotiable}>Negotiable</Text> : null}
          </View>

          <View style={styles.statRow}>
            {stats.slice(0, 3).map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.summary}>
        {summary.map((row) => (
          <Pressable
            key={row.label}
            onPress={() => onJumpToStep(row.step)}
            style={({ pressed }) => [styles.summaryRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${row.label}`}
          >
            <Ionicons name={row.icon} size={18} color={BRAND} />
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{row.value}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
          </Pressable>
        ))}
      </View>

      <View onLayout={onLayout}>
        <Pressable
          onPress={() => set('acceptedTerms', !state.acceptedTerms)}
          style={styles.termsRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: state.acceptedTerms }}
        >
          <View style={[
            styles.checkbox,
            state.acceptedTerms && styles.checkboxOn,
            error && !state.acceptedTerms ? styles.checkboxError : null,
          ]}>
            {state.acceptedTerms ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text style={styles.termsText}>
            I confirm all the information provided is accurate and I agree to PropFind's listing terms.
          </Text>
        </Pressable>
        <FieldError message={error} />
      </View>

      <Text style={styles.reviewNote}>
        Your listing goes to our review team first. You'll be notified the moment it is live.
      </Text>
    </View>
  )
}

function featureCount(s: WizardState): string {
  const extras =
    (s.waterSource ? 1 : 0) + (s.electricService ? 1 : 0) +
    (s.fenced ? 1 : 0) + (s.boundaryWall ? 1 : 0) + (s.cornerPlot ? 1 : 0) + (s.hasWell ? 1 : 0) +
    s.crops.length
  const total = s.amenityIds.length + extras
  return total === 0 ? 'None selected' : `${total} selected`
}

const styles = StyleSheet.create({
  card:        { borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  coverWrap:   { height: 170, backgroundColor: colors.borderLight },
  cover:       { width: '100%', height: '100%' },
  coverEmpty:  { alignItems: 'center', justifyContent: 'center' },
  coverTag:    { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(15,23,42,0.7)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  coverTagText:{ color: '#fff', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14 },
  countTag:    { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.7)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  countTagText:{ color: '#fff', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14 },
  videoTag:    { position: 'absolute', right: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BRAND, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },

  cardBody:    { padding: 14 },
  cardTitle:   { ...typography.title },
  whereRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  where:       { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  price:       { fontFamily: fonts.extra, fontSize: 20, lineHeight: 26, color: BRAND },
  negotiable:  { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.accentDeep },

  statRow:     { flexDirection: 'row', gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 },
  stat:        { flex: 1 },
  statValue:   { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  statLabel:   { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.mutedLight, marginTop: 2 },

  summary:     { marginTop: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  summaryLabel:{ fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  summaryValue:{ flex: 1, textAlign: 'right', fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },

  termsRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20 },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  checkboxOn:  { backgroundColor: BRAND, borderColor: BRAND },
  checkboxError:{ borderColor: colors.danger, backgroundColor: '#fef2f2' },
  termsText:   { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: '#334155' },
  reviewNote:  { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 14 },
})
