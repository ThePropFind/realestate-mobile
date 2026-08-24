import type { TextStyle } from 'react-native'
import { colors } from './colors'

// Plus Jakarta Sans — loaded in app/_layout.tsx via @expo-google-fonts.
// NOTE: React Native does NOT map `fontWeight` onto custom-font variants — each
// weight is its own font family and must be named explicitly. Use `fonts.*`
// (or the presets below) instead of `fontWeight`.
export const fonts = {
  regular:  'PlusJakartaSans_400Regular',
  medium:   'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold:     'PlusJakartaSans_700Bold',
  extra:    'PlusJakartaSans_800ExtraBold',
  // No serif face. Playfair Display was dropped 2026-08-20 — the property detail
  // mockup sets every display slot (title, price, section headings) in bold sans,
  // and a serif that only appears on some screens read as inconsistent.
} as const

/**
 * The type scale. Spread a preset and override only colour.
 *
 * HOME IS THE REFERENCE. `app/(tabs)/index.tsx` is the screen whose sizes were
 * settled against the mocks on a real device, so anything playing the same role
 * on another screen takes its size from here instead of being re-guessed. Screen
 * titles had drifted to seven different values (17, 18, 19, 20, 21, 24) for what
 * is one role; the two title presets below exist to stop that happening again.
 *
 * The distinction that matters:
 *   screenTitle — the big left-aligned heading a screen opens with (Saved,
 *                 Bookings, Search). Announces the page.
 *   navTitle    — the title in a nav bar, on the row with the back arrow
 *                 (Filters, Post, EMI, a pushed profile). Smaller BY ROLE, not
 *                 by accident: it labels a bar, it does not head a page.
 *
 * Body sizes on home run a point or so tighter than the platform default
 * (13 for inputs and row labels, 12.5 for button text) — `label` and `caption`
 * carry those, and a screen that wants "the home look" should use them rather
 * than 14/13.
 */
export const typography = {
  /** Home's hero headline. The one oversized slot in the app — nothing else. */
  hero:        { fontFamily: fonts.bold, fontSize: 26, lineHeight: 33, color: colors.white },
  h1:          { fontFamily: fonts.bold, fontSize: 22, lineHeight: 29, color: colors.ink },
  /** Section heading inside a screen — home's "Featured Property", "Recent". */
  h2:          { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  screenTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  navTitle:    { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink },
  title:       { fontFamily: fonts.bold,     fontSize: 16, lineHeight: 21, color: colors.ink },
  body:        { fontFamily: fonts.regular,  fontSize: 14, lineHeight: 20, color: colors.muted },
  label:       { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  caption:     { fontFamily: fonts.medium,   fontSize: 12, lineHeight: 16, color: colors.muted },
} satisfies Record<string, TextStyle>
