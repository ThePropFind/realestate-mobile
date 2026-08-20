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
 * ⑥ Location & Nearby Places — map thumbnail on the left, address on the right,
 * curated nearby places underneath.
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

  // "State PIN" — both halves are optional, so the line is built, not templated.
  const regionLine = [data.cityState, data.pincode].filter(Boolean).join(' ')

  const openInMaps = () => {
    const url = Platform.select({
      ios:     `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(data.title)}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(data.title)})`,
      default: `https://www.google.com/maps?q=${lat},${lng}`,
    })!
    Linking.openURL(url).catch(() => appAlert('Could not open map'))
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.mapWrap}>
          {/* pointerEvents="none": on Android the MapView swallows touches even
              with every gesture disabled, which would leave the button below —
              and the whole "tap to open maps" affordance — dead. */}
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={colors.brand} />
          </MapView>
        </View>

        <Pressable
          onPress={openInMaps}
          accessibilityRole="button"
          accessibilityLabel="Open this location in your maps app"
          style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.mapBtnText}>View on Map</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.brand} />
        </Pressable>
      </View>

      {/* Address AND nearby places share the right column, beside the map —
          the nearby list is not a separate full-width block below it. */}
      <View style={styles.right}>
        {data.addressLine ? <Text style={styles.addr}>{data.addressLine}</Text> : null}
        <Text style={styles.addr}>{data.localityName}, {data.cityName}</Text>
        {regionLine ? <Text style={styles.addr}>{regionLine}</Text> : null}
        {/* Out of the map and into the text column: as a 10px overlay on a
            120dp thumbnail this was unreadable. */}
        {!hasExactPin ? (
          <Text style={styles.notice}>
            Showing the locality — the owner has not set an exact pin
          </Text>
        ) : null}

        {nearby.length ? (
          <View style={styles.nearby}>
            {nearby.map((p, i) => (
              <View key={`${p.name}-${i}`} style={styles.nearbyRow}>
                <Ionicons name={landmarkIcon(p.kind)} size={12} color={colors.brand} />
                {/* Wraps rather than truncates — "Coimbatore Intl. Airport" clipped to
                    "Coimbatore Intl. Ai…" is worse than an uneven row. */}
                <Text style={styles.nearbyName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.nearbyDist}>{p.distanceLabel}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // 'stretch' (the default) is load-bearing: it lets the map column match the
  // height of the nearby list beside it instead of leaving dead space below the
  // button when a listing has many landmarks.
  wrap:  { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  // 42%, not the mockup's ~45%: our real landmark names are far longer than its
  // samples, and the text column needs the width more than the map does.
  left:  { width: '42%' },
  right: { flex: 1, minWidth: 0 },

  // flex:1 — the map grows to fill whatever height the row ends up being, so it
  // tracks the nearby count. minHeight keeps it usable when there are none.
  mapWrap: { flex: 1, minHeight: 120, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.border },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: spacing.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.brand, borderRadius: radius.sm,
  },
  mapBtnText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.brand },

  addr:   { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  notice: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: colors.mutedLight, marginTop: 6 },

  // No rule and no full-width break — this list lives inside the right column,
  // so it only needs a little air under the address.
  nearby: { marginTop: spacing.sm },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  // ~168dp of column: the name takes what is left after the icon and distance.
  nearbyName: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.ink, flex: 1, minWidth: 0 },
  nearbyDist: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.muted, flexShrink: 0 },
})
