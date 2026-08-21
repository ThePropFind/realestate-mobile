import type { MapStyleElement } from 'react-native-maps'

/**
 * Day-mode Google Maps style for the Map tab.
 *
 * This exists because of a real bug, not for decoration: `mapType="standard"`
 * on Android renders Google's NIGHT palette whenever the host activity is in a
 * dark theme, so on a phone set to dark mode the map came back deep blue while
 * the design calls for a light one. Supplying any custom style overrides that
 * automatic night switch, so every entry below is pinned to a daytime colour
 * and the map looks the same on both system themes.
 *
 * The palette is nudged toward the brand rather than left at Google's default:
 * warm-ivory landscape, sage parks, brass highways.
 */
export const LIGHT_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#f6f3ec' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5b5b55' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
  { elementType: 'labels.icon', stylers: [{ saturation: -40 }] },

  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d8d4ca' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3f4a44' }] },

  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eeece2' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f6f3ec' }] },

  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e9e6db' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f6f68' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dde5d0' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#5c7050' }] },
  // Business pins compete with our price pills for attention — mute them.
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7a7a72' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fdf8ea' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f3dda6' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e6c983' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6b5a30' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9dde6' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7a97a3' }] },
]
