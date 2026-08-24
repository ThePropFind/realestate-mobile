import { useMemo } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from '../Text'
import { ChipField, ChipMultiField, SectionLabel, StepHeading } from './fields'
import { colors, fonts } from '../../theme'
import { isAgri, isPlotOrLand, type WizardState } from '../../lib/postWizard'
import type { Amenity } from '../../types'

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

/** Amenities seeded with this category describe land, not a building (V18). */
const LAND_CATEGORY = 'land'

const CROPS = ['Coconut', 'Banana', 'Mango', 'Arecanut', 'Sugarcane', 'Paddy', 'Turmeric', 'Other']

/** Boolean land features, presented as one multi-select row like the mock. */
type LandFeature = 'FENCED' | 'BOUNDARY_WALL' | 'CORNER' | 'WELL'
/** Only the boolean keys — so toggling one can never write `true` into a string field. */
type BooleanKey = Extract<{
  [K in keyof WizardState]: WizardState[K] extends boolean ? K : never
}[keyof WizardState], string>
const LAND_FEATURES: { value: LandFeature; label: string; key: BooleanKey }[] = [
  { value: 'FENCED',        label: 'Fencing',       key: 'fenced' },
  { value: 'BOUNDARY_WALL', label: 'Compound wall', key: 'boundaryWall' },
  { value: 'CORNER',        label: 'Corner plot',   key: 'cornerPlot' },
  { value: 'WELL',          label: 'Well on land',  key: 'hasWell' },
]

/**
 * Step 5 — what the property has.
 *
 * Two different screens behind one step: a building gets the amenity master
 * list, land gets the things a land buyer actually asks about (water, power,
 * fencing, what is growing on it). Both are optional.
 */
export function StepFeatures({
  state, set, amenities, loading,
}: {
  state: WizardState
  set: Setter
  amenities: Amenity[]
  loading: boolean
}) {
  const land = isPlotOrLand(state)
  const agri = isAgri(state)

  const relevant = useMemo(
    () => amenities.filter((a) => (land ? a.category === LAND_CATEGORY : a.category !== LAND_CATEGORY)),
    [amenities, land],
  )

  const byCategory = useMemo(() => {
    const map: Record<string, Amenity[]> = {}
    relevant.forEach((a) => {
      const k = a.category || 'other'
      if (!map[k]) map[k] = []
      map[k].push(a)
    })
    return map
  }, [relevant])

  const toggleAmenity = (id: string) => {
    const next = new Set(state.amenityIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    set('amenityIds', Array.from(next))
  }

  const toggleCrop = (crop: string) => {
    const next = state.crops.includes(crop)
      ? state.crops.filter((c) => c !== crop)
      : [...state.crops, crop]
    set('crops', next)
  }

  const activeLandFeatures = LAND_FEATURES.filter((f) => state[f.key]).map((f) => f.value)

  const toggleLandFeature = (v: LandFeature) => {
    const feature = LAND_FEATURES.find((f) => f.value === v)
    if (!feature) return
    set(feature.key, !state[feature.key])
  }

  return (
    <View>
      <StepHeading title="Amenities & features" subtitle="Select what this property has. All optional." />

      {land ? (
        <>
          <ChipField
            label="Water source"
            options={[
              { value: 'BOREWELL',  label: 'Borewell' },
              { value: 'OPEN_WELL', label: 'Open well' },
              { value: 'CANAL',     label: 'Canal' },
              { value: 'RIVER',     label: 'River' },
              { value: 'RAIN_FED',  label: 'Rain-fed' },
              { value: 'NONE',      label: 'None' },
            ]}
            value={state.waterSource}
            onChange={(v) => set('waterSource', state.waterSource === v ? null : (v as WizardState['waterSource']))}
          />

          <ChipField
            label="Electricity"
            options={[
              { value: 'AVAILABLE_3PHASE', label: '3-phase power' },
              { value: 'AVAILABLE_1PHASE', label: '1-phase power' },
              { value: 'AGRI_CONNECTION',  label: 'Agri connection' },
              { value: 'NONE',             label: 'No connection' },
            ]}
            value={state.electricService}
            onChange={(v) => set('electricService', state.electricService === v ? null : (v as WizardState['electricService']))}
          />

          <ChipMultiField
            label="Land features"
            options={LAND_FEATURES.map((f) => ({ value: f.value, label: f.label }))}
            values={activeLandFeatures}
            onToggle={toggleLandFeature}
          />

          {agri ? (
            <>
              <ChipMultiField
                label="Crops"
                hint="What is growing on the land right now."
                options={CROPS.map((c) => ({ value: c, label: c }))}
                values={state.crops}
                onToggle={toggleCrop}
              />
            </>
          ) : null}
        </>
      ) : null}

      <SectionLabel>{land ? 'On the property' : 'Amenities'}</SectionLabel>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.brand} />
          <Text style={styles.dim}>Loading amenities…</Text>
        </View>
      ) : relevant.length === 0 ? (
        <Text style={styles.dim}>No amenities to pick for this property type.</Text>
      ) : (
        Object.entries(byCategory).map(([cat, list]) => (
          <View key={cat} style={{ marginBottom: 4 }}>
            <Text style={styles.catLabel}>{cat.toUpperCase()}</Text>
            <ChipMultiField
              options={list.map((a) => ({ value: a.id, label: a.name }))}
              values={state.amenityIds.filter((id) => list.some((a) => a.id === id))}
              onToggle={toggleAmenity}
            />
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  catLabel:   { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.5, color: colors.mutedLight, marginBottom: 8 },
  dim:        { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
