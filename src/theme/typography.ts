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

// Reusable text presets — size + family + line height, colour optional.
export const typography = {
  hero:    { fontFamily: fonts.bold,  fontSize: 26, color: colors.white },
  h1:      { fontFamily: fonts.bold,  fontSize: 22, color: colors.ink },
  h2:      { fontFamily: fonts.bold,  fontSize: 20, color: colors.ink },
  title:   { fontFamily: fonts.bold,     fontSize: 16, color: colors.ink },
  body:    { fontFamily: fonts.regular,  fontSize: 14, color: colors.muted, lineHeight: 20 },
  label:   { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  caption: { fontFamily: fonts.medium,   fontSize: 12, color: colors.muted },
} satisfies Record<string, TextStyle>
