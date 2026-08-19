import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { appAlert } from '../AppAlert'
import { colors, fonts, radius, spacing } from '../../theme'
import { landmarkIcon } from '../../lib/amenityIcons'
import type { NearbyPlace, PropertyDetail } from '../../types'

/** Coimbatore centre — the map still has to render when a listing has no pin. */
const FALLBACK = { latitude: 11.0168, longitude: 76.9558 }

/**
 * ⑥ Map thumbnail, address, curated nearby places.
 *
 * `nearby` comes from the server (B3) rather than a client table, so web and mobile
 * cannot drift and a listing outside a curated city gets an empty list instead of
 * another city's landmarks presented as fact.
 */
export function LocationSection({ data }: { data: PropertyDetail }) {
  const lat = data.latitude ?? FALLBACK.latitude
  const lng = data.longitude ?? FALLBACK.longitude
  const hasExactPin = data.latitude != null && data.longitude != null
  const nearby: NearbyPlace[] = data.nearby ?? []

  const openInMaps = () => {
    const url = Platform.select({
      ios:     `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(data.title)}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(data.title)})`,
      default: `https://www.google.com/maps?q=${lat},${lng}`,
    })!
    Linking.openURL(url).catch(() => appAlert('Could not open map'))
  }

  return (
    <View>
      <Pressable onPress={openInMaps} style={styles.mapWrap}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={colors.accent} />
        </MapView>
        {!hasExactPin ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Showing the locality — the owner has not set an exact pin</Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.addrRow}>
        <Ionicons name="location-outline" size={15} color={colors.brand} />
        <Text style={styles.addr}>
          {data.addressLine ? `${data.addressLine}, ` : ''}{data.localityName}, {data.cityName}
        </Text>
      </View>

      {nearby.length ? (
        <View style={styles.nearby}>
          <Text style={styles.nearbyHead}>Nearby places</Text>
          {nearby.map((p, i) => (
            <View key={`${p.name}-${i}`} style={styles.nearbyRow}>
              <View style={styles.nearbyIcon}>
                <Ionicons name={landmarkIcon(p.kind)} size={14} color={colors.brand} />
              </View>
              <Text style={styles.nearbyName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.nearbyDist}>{p.distanceLabel}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  mapWrap: { height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border },
  notice: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,51,47,0.72)', paddingVertical: 6, paddingHorizontal: spacing.md,
  },
  noticeText: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: colors.white },

  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.md },
  addr: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted, flex: 1 },

  nearby: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  nearbyHead: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.ink, marginBottom: spacing.sm },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 7 },
  nearbyIcon: {
    width: 28, height: 28, borderRadius: radius.pill,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  nearbyName: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink, flex: 1 },
  nearbyDist: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.brand },
})
