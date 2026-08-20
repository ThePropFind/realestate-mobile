// Centralized colour tokens — single source of truth for the app's palette.
// Previously each screen re-declared `const BRAND = '#184A45'` inline; import
// from here instead so the brand aesthetic stays consistent everywhere.
// Palette: "Green Growth" (Eco-Suburban) — Forest Green + Brass Gold on Warm Ivory.
export const colors = {
  // Brand — Forest Green
  brand:      '#184A45',
  brandDark:  '#0f332f',
  brandTint:  '#e6ece1', // pale sage — icon circles / soft fills
  sage:       '#A3B18A', // secondary UI (chips, tabs)
  accent:     '#C6A15B', // Brass Gold — CTA / badges / premium
  accentDeep: '#8A6A28', // Brass, darkened so WHITE label text clears WCAG AA

  // Text — Stone Gray for body, near-black for headings
  ink:        '#0f172a',
  muted:      '#6E6E6E',
  mutedLight: '#9a9a94',

  // Surfaces & borders — Warm Ivory bg, white cards
  bg:         '#F7F3ED',
  white:      '#fff',
  border:     '#e2e8f0',
  borderLight:'#eef2f7',

  // Semantic (already used across status badges / forms)
  success:    '#16a34a',
  warning:    '#b45309',
  danger:     '#dc2626',
} as const

// Forest gradient — floating headers + tab bar + hero fallback backdrop.
export const headerGradient = ['#0f332f', '#184A45'] as const
export const heroGradient = ['#2a6d63', '#184A45', '#0f332f'] as const

export type ColorToken = keyof typeof colors
