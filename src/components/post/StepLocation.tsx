import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Text, TextInput } from '../Text'
import { MapLocationPicker } from '../MapLocationPicker'
import { CounterField, FIELD_GAP, FieldError, SectionLabel, SelectField, StepHeading, useFieldError } from './fields'
import { colors, fonts, radius, typography } from '../../theme'
import { ADDRESS_MAX, type WizardState } from '../../lib/postWizard'
import type { City, Locality } from '../../types'

const BRAND = colors.brand

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

/**
 * Step 4 — where the property is.
 *
 * Location used to be four fields buried at the bottom of the details step, and
 * the city was hardcoded to Coimbatore. Both are fixed here: the city comes from
 * /search/cities like everywhere else in the app, and the locality list reloads
 * with it.
 */
export function StepLocation({
  state, set, cities, localities, localitiesLoading,
}: {
  state: WizardState
  set: Setter
  cities: City[]
  localities: Locality[]
  localitiesLoading: boolean
}) {
  const [query, setQuery] = useState('')
  const [mapOpen, setMapOpen] = useState(false)
  const locality = useFieldError('localityId')
  const hasPin = state.latitude != null && state.longitude != null

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? localities.filter((l) => l.name.toLowerCase().includes(q)) : localities
    return list.slice(0, 12)
  }, [localities, query])

  const selected = localities.find((l) => l.id === state.localityId) ?? null

  return (
    <View>
      <StepHeading title="Location" subtitle="Add the location of your property." />

      <SelectField
        label="City"
        name="cityId"
        required
        placeholder="Choose a city"
        value={state.cityId}
        options={cities.map((c) => ({ value: c.id, label: c.name, sublabel: c.state }))}
        sheetTitle="Where is the property?"
        onSelect={(id) => {
          if (id === state.cityId) return
          const city = cities.find((c) => c.id === id)
          set('cityId', id)
          set('cityName', city?.name ?? '')
          // Localities belong to a city — keeping the old one would attach the
          // listing to a locality in a different city.
          set('localityId', null)
          setQuery('')
        }}
      />

      <View style={styles.fieldWrap} onLayout={locality.onLayout}>
        <Text style={[styles.label, locality.error ? styles.labelError : null]}>Locality *</Text>
        <View style={[styles.searchRow, locality.error ? styles.searchRowError : null]}>
          <Ionicons name="search-outline" size={17} color={colors.mutedLight} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search locality"
            placeholderTextColor={colors.mutedLight}
            style={styles.searchInput}
            editable={!!state.cityId}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear locality search">
              <Ionicons name="close-circle" size={17} color={colors.mutedLight} />
            </Pressable>
          ) : null}
        </View>

        {!state.cityId ? (
          <Text style={styles.dim}>Choose a city first.</Text>
        ) : localitiesLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={BRAND} />
            <Text style={styles.dim}>Loading localities…</Text>
          </View>
        ) : matches.length === 0 ? (
          <Text style={styles.dim}>
            {localities.length === 0
              ? 'No localities listed for this city yet.'
              : `No locality matches “${query.trim()}”.`}
          </Text>
        ) : (
          <View style={styles.chipWrap}>
            {matches.map((loc) => {
              const on = state.localityId === loc.id
              return (
                <Pressable
                  key={loc.id}
                  onPress={() => set('localityId', loc.id)}
                  style={[styles.chip, on && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{loc.name}</Text>
                </Pressable>
              )
            })}
          </View>
        )}
        {selected ? <Text style={styles.selected}>Selected: {selected.name}</Text> : null}
        <FieldError message={locality.error} />
      </View>

      <CounterField
        label="Full address"
        name="addressLine"
        required
        max={ADDRESS_MAX}
        placeholder="Door number, street, landmark"
        multiline
        numberOfLines={3}
        style={{ height: 84, textAlignVertical: 'top' }}
        value={state.addressLine}
        onChangeText={(t) => set('addressLine', t)}
      />

      <CounterField
        label="Pincode"
        name="pincode"
        placeholder="641012"
        keyboardType="number-pad"
        maxLength={6}
        value={state.pincode}
        onChangeText={(t) => set('pincode', t.replace(/[^0-9]/g, ''))}
      />

      <SectionLabel hint="A pinned listing shows up in map search and gets noticeably more calls.">
        Exact location
      </SectionLabel>

      <Pressable onPress={() => setMapOpen(true)} style={styles.mapCard} accessibilityRole="button">
        {hasPin ? (
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            pointerEvents="none"
            region={{
              latitude: state.latitude as number,
              longitude: state.longitude as number,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={{ latitude: state.latitude as number, longitude: state.longitude as number }} />
          </MapView>
        ) : (
          <View style={styles.mapEmpty}>
            <Ionicons name="map-outline" size={26} color={BRAND} />
            <Text style={styles.mapEmptyText}>No location pinned yet</Text>
          </View>
        )}
        <View style={styles.pinBtn}>
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.pinBtnText}>{hasPin ? 'Change pin' : 'Pin exact location'}</Text>
        </View>
      </Pressable>

      {hasPin ? (
        <Pressable
          onPress={() => { set('latitude', null); set('longitude', null) }}
          style={styles.clearPin}
          accessibilityRole="button"
        >
          <Text style={styles.clearPinText}>Remove pin</Text>
        </Pressable>
      ) : null}

      <MapLocationPicker
        visible={mapOpen}
        initialLocation={hasPin ? { latitude: state.latitude as number, longitude: state.longitude as number } : null}
        onCancel={() => setMapOpen(false)}
        onConfirm={(loc) => {
          set('latitude', loc.latitude)
          set('longitude', loc.longitude)
          setMapOpen(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  fieldWrap:   { marginBottom: FIELD_GAP },
  label:       { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink, marginBottom: 8 },
  labelError:  { color: colors.danger },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: colors.white },
  searchRowError: { borderColor: colors.danger, backgroundColor: '#fef2f2' },
  searchInput: { flex: 1, paddingVertical: 13, ...typography.input },
  chipWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip:        { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
  chipOn:      { borderColor: BRAND, backgroundColor: colors.brandTint },
  chipText:    { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.muted },
  chipTextOn:  { fontFamily: fonts.bold, color: BRAND },
  selected:    { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.success, marginTop: 8 },
  dim:         { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 10 },
  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },

  mapCard:     { height: 150, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: 'flex-end' },
  mapEmpty:    { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brandTint },
  mapEmptyText:{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  pinBtn:      { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  pinBtnText:  { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: '#fff' },
  clearPin:    { alignSelf: 'flex-start', paddingVertical: 10 },
  clearPinText:{ fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.danger },
})
