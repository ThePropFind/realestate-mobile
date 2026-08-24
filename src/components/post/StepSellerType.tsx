import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { CounterField, Divider, FieldError, SectionLabel, StepHeading, useFieldError } from './fields'
import { colors, fonts, radius, shadow, typography } from '../../theme'
import type { WizardState } from '../../lib/postWizard'
import type { ListedBy } from '../../types'

const BRAND = colors.brand

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

const OPTIONS: { value: ListedBy; title: string; sub: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'OWNER',    title: 'Owner',             sub: "I'm posting my own property",      icon: 'person-circle-outline' },
  { value: 'PROMOTER', title: 'Builder / Promoter', sub: "I'm a builder or developer",       icon: 'business-outline' },
  { value: 'AGENT',    title: 'Agent',             sub: "I'm listing on behalf of an owner", icon: 'briefcase-outline' },
]

/**
 * Step 1 — who is posting.
 *
 * Builders used to be routed to a separate one-off form that skipped Step 2
 * entirely, which meant their listing type silently defaulted and their listings
 * carried a project name where a title belonged. Now the builder-only fields
 * simply unfold here and every seller walks the same eight steps.
 */
export function StepSellerType({ state, set }: { state: WizardState; set: Setter }) {
  const { error, onLayout } = useFieldError('listedBy')
  return (
    <View>
      <StepHeading title="Who are you listing as?" subtitle="This helps us personalise your listing experience." />

      <View style={{ gap: 12 }} onLayout={onLayout}>
        {OPTIONS.map((o) => {
          const selected = state.listedBy === o.value
          return (
            <Pressable
              key={o.value}
              onPress={() => set('listedBy', o.value)}
              style={({ pressed }) => [styles.card, selected && styles.cardOn, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={[styles.icon, selected && { backgroundColor: BRAND }]}>
                <Ionicons name={o.icon} size={24} color={selected ? '#fff' : BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{o.title}</Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={BRAND} /> : null}
            </Pressable>
          )
        })}
      </View>
      <FieldError message={error} />

      {state.listedBy === 'PROMOTER' ? (
        <>
          <Divider />
          <SectionLabel hint="Shown on your listings so buyers know who they are dealing with.">
            About your business
          </SectionLabel>
          <CounterField
            label="Project / Company name"
            name="promoterProjectName"
            required
            max={80}
            placeholder="e.g. Sunrise Greens Phase 2"
            value={state.promoterProjectName}
            onChangeText={(t) => set('promoterProjectName', t)}
          />
          <CounterField
            label="Years of experience"
            name="promoterYearsExperience"
            required
            placeholder="e.g. 8"
            keyboardType="number-pad"
            maxLength={2}
            value={state.promoterYearsExperience}
            onChangeText={(t) => set('promoterYearsExperience', t.replace(/[^0-9]/g, ''))}
          />
          <CounterField
            label="Projects delivered"
            placeholder="e.g. 12"
            keyboardType="number-pad"
            maxLength={4}
            value={state.promoterTotalProjects}
            onChangeText={(t) => set('promoterTotalProjects', t.replace(/[^0-9]/g, ''))}
          />
          <CounterField
            label="Cities you are active in"
            max={120}
            placeholder="Coimbatore, Tirupur"
            value={state.promoterCitiesActive}
            onChangeText={(t) => set('promoterCitiesActive', t)}
          />
          <CounterField
            label="RERA ID"
            max={60}
            hint="Optional, but listings with a RERA ID get reviewed faster."
            placeholder="TN/01/Building/0000/2024"
            autoCapitalize="characters"
            value={state.promoterReraId}
            onChangeText={(t) => set('promoterReraId', t)}
          />
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...shadow.card },
  cardOn: { borderColor: BRAND, borderWidth: 1.5, backgroundColor: colors.brandTint },
  icon:   { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center' },
  title:  { ...typography.cardTitle },
  sub:    { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
})
