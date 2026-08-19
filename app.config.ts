import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Dynamic config layered on top of app.json (#27): the Google Maps API key is
 * injected from the environment instead of being committed to source control.
 *
 * - Local dev: put GOOGLE_MAPS_API_KEY in `.env` (gitignored; see `.env.example`).
 *   Expo Go ignores it anyway — maps in Expo Go use Expo's own key.
 * - EAS builds: `eas env:create --name GOOGLE_MAPS_API_KEY --value <key>` so the
 *   key is injected at build time only.
 *
 * EXPO_PUBLIC_API_URL does the same for the backend: unset it and the app talks
 * to prod (app.json); set it in `.env` to point at a local API over the LAN.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl,
    // Base for shared listing links. Lives here rather than in code so ROADMAP
    // Phase 5 can point shares at thepropfind.com without touching a component.
    webUrl:
      process.env.EXPO_PUBLIC_WEB_URL
      || config.extra?.webUrl
      || 'https://realestate-frontend-seven-topaz.vercel.app',
  },
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
})
