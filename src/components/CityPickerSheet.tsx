import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { searchApi } from '../lib/api'
import { DraggableSheet, SheetGrabZone } from './DraggableSheet'
import { useLocationStore, DEFAULT_CITY, type SelectedCity } from '../store/locationStore'
import { colors, fonts, radius } from '../theme'
import type { City } from '../types'

const BRAND = colors.brand
const ACCENT = colors.accent

/**
 * Bottom sheet for choosing your city. Supported cities load from the API
 * (`active` flag); "Use my current location" reverse-geocodes via GPS and,
 * when we don't operate there yet, shows an "expanding soon" state instead
 * of pretending to cover it — the InvusProp pattern.
 */
export function CityPickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { city: selected, setCity } = useLocationStore()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [notHereYet, setNotHereYet] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setNotHereYet(null)
    let mounted = true
    ;(async () => {
      try {
        const { data } = await searchApi.cities()
        if (mounted) setCities(data.filter((c) => c.active))
      } catch {
        if (mounted) setCities([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [visible])

  const pick = (c: SelectedCity) => {
    setCity(c)
    onClose()
  }

  const detect = async () => {
    setDetecting(true)
    setNotHereYet(null)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setNotHereYet('your area (location permission denied)')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      })
      const place = addr?.city || addr?.district || addr?.subregion || addr?.region || 'your area'
      const match = cities.find((c) =>
        place.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(place.toLowerCase()),
      )
      if (match) {
        pick({ name: match.name, slug: match.slug, state: match.state })
      } else {
        setNotHereYet(place)
      }
    } catch {
      setNotHereYet('your area')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <SheetGrabZone>
        <Text style={styles.title}>Choose your city</Text>
      </SheetGrabZone>

      {/* GPS detect */}
      <Pressable style={styles.detectRow} onPress={detect} disabled={detecting}>
        {detecting
          ? <ActivityIndicator size="small" color={BRAND} />
          : <Ionicons name="navigate" size={18} color={BRAND} />}
        <Text style={styles.detectText}>{detecting ? 'Detecting…' : 'Use my current location'}</Text>
      </Pressable>

      {/* Expanding-soon state for unsupported detections */}
      {notHereYet ? (
        <View style={styles.soonBox}>
          <Ionicons name="rocket-outline" size={20} color={ACCENT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.soonTitle}>We&apos;re not in {notHereYet} yet</Text>
            <Text style={styles.soonBody}>
              PropFind is expanding city by city. Browse {DEFAULT_CITY.name} for now — we&apos;ll be in more cities soon.
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Available now</Text>
      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginVertical: 16 }} />
      ) : (
        // Bounded scroll area keeps the drag-handle reachable and the backdrop
        // visible even when the supported-city list grows long.
        <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.4 }} showsVerticalScrollIndicator={false}>
          {(cities.length ? cities : [{ id: 'default', name: DEFAULT_CITY.name, slug: DEFAULT_CITY.slug, state: DEFAULT_CITY.state, active: true }]).map((c) => {
            const on = selected.slug === c.slug
            return (
              <Pressable key={c.id} style={[styles.cityRow, on && styles.cityRowOn]}
                onPress={() => pick({ name: c.name, slug: c.slug, state: c.state })}>
                <Ionicons name="location" size={16} color={on ? '#fff' : BRAND} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cityName, on && { color: '#fff' }]}>{c.name}</Text>
                  <Text style={[styles.cityState, on && { color: '#dbeafe' }]}>{c.state}</Text>
                </View>
                {on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      <Text style={styles.footerNote}>More cities coming soon</Text>
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  title:       { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 6, marginBottom: 12 },

  detectRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: '#d3ddc9', backgroundColor: colors.brandTint, marginBottom: 12 },
  detectText:  { fontFamily: fonts.semibold, fontSize: 14, color: BRAND },

  soonBox:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: radius.sm, padding: 12, marginBottom: 12 },
  soonTitle:   { fontFamily: fonts.bold, fontSize: 14, color: '#9a3412' },
  soonBody:    { fontFamily: fonts.regular, fontSize: 12, color: '#9a3412', marginTop: 2, lineHeight: 17 },

  sectionLabel:{ fontFamily: fonts.semibold, fontSize: 12, color: colors.mutedLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  cityRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  cityRowOn:   { backgroundColor: BRAND, borderColor: BRAND },
  cityName:    { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  cityState:   { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },

  footerNote:  { textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.mutedLight, marginTop: 8 },
})
