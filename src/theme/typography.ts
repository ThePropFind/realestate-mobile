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
 * Body copy on home runs a point tighter than the platform default: 13 for
 * descriptive text, row labels and inputs, 12 for meta. The rest of the app had
 * settled on 14/15 for the same roles, which is what made every other screen
 * read heavier than home. The body presets below carry home's values, and the
 * 2026-08-24 sweep moved every screen onto them.
 *
 * Roles, so a new screen does not have to guess:
 *   cardTitle — the title of a listing / row card
 *   body      — descriptive copy, empty-state text, sheet blurbs
 *   label     — a row label or a form label
 *   button    — EVERY button's label. One size, deliberately: the app had 13,
 *               14 and 15 competing on buttons that sit next to each other.
 *   input     — the text inside a text field
 *   caption   — meta, helper text, timestamps
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
  cardTitle:   { fontFamily: fonts.bold,     fontSize: 15, lineHeight: 20, color: colors.ink },
  body:        { fontFamily: fonts.regular,  fontSize: 13, lineHeight: 19, color: colors.muted },
  label:       { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  button:      { fontFamily: fonts.bold,     fontSize: 13, lineHeight: 18, color: colors.white },
  input:       { fontFamily: fonts.medium,   fontSize: 13, color: colors.ink },
  caption:     { fontFamily: fonts.medium,   fontSize: 12, lineHeight: 16, color: colors.muted },
} satisfies Record<string, TextStyle>
