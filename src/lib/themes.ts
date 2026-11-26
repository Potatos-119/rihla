/**
 * Rihla colour themes. Each theme is a complete token set; applyTheme() writes it to CSS
 * custom properties, which the Tailwind colour utilities (bg-gulf-900, text-lagoon, …) read.
 * The token names are historical: "gulf" is the brand colour, "pearl" the text on it,
 * "lagoon" the accent, "sand" the warm surface, "bh" the alert colour.
 *
 * scripts/check-contrast.ts checks every theme against WCAG AA.
 */

export interface ThemeColors {
  bg: string
  surface: string
  surface2: string
  line: string
  text: string
  muted: string
  /** header, primary buttons, explanation panel */
  brand: string
  brand2: string
  /** photo overlays and the darkest brand shade */
  brandDeep: string
  /** text and icons on the brand colour */
  onBrand: string
  /** the wordmark's Arabic and other decorative text on the brand colour */
  onBrandAccent: string
  accent: string
  accentSoft: string
  warm: string
  warm2: string
  alert: string
  alertSoft: string
  /** route and pin colour for day 1, 2, 3; pin numbers use pinText */
  days: [string, string, string]
  pinText: string
}

export interface Theme {
  id: string
  name: string
  arabic: string
  mood: string
  dark: boolean
  /** CSS filter applied to the OpenStreetMap tiles */
  tiles: string
  colors: ThemeColors
}

export const THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    arabic: 'نهار',
    mood: 'Gulf morning: pearl white and deep teal',
    dark: false,
    tiles: 'saturate(0.65) contrast(1.02)',
    colors: {
      bg: '#f4f6f3',
      surface: '#ffffff',
      surface2: '#e9eeeb',
      line: '#d9e1de',
      text: '#13262b',
      muted: '#566b70',
      brand: '#0f3b45',
      brand2: '#17505c',
      brandDeep: '#08222a',
      onBrand: '#f4f6f3',
      onBrandAccent: '#e6dcc8',
      accent: '#1a6c64',
      accentSoft: '#d5ece8',
      warm: '#e6dcc8',
      warm2: '#d6c7a8',
      alert: '#b80f2a',
      alertSoft: '#fbe5e8',
      days: ['#0f3b45', '#1a6c64', '#9a6a22'],
      pinText: '#ffffff',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    arabic: 'ليل',
    mood: 'The Gulf after sunset',
    dark: true,
    tiles: 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.45)',
    colors: {
      bg: '#0a1e24',
      surface: '#10303a',
      surface2: '#163a45',
      line: '#24505c',
      text: '#e7eeec',
      muted: '#9cb6bb',
      brand: '#0f3b45',
      brand2: '#17505c',
      brandDeep: '#04161b',
      onBrand: '#f4f6f3',
      onBrandAccent: '#e6dcc8',
      accent: '#63cbbf',
      accentSoft: '#1c4a4a',
      warm: '#e6dcc8',
      warm2: '#d6c7a8',
      alert: '#ff8a97',
      alertSoft: '#4a1d27',
      days: ['#7fd6cb', '#e8c37a', '#f2a1ad'],
      pinText: '#04161b',
    },
  },
  {
    id: 'sukkar',
    name: 'Sukkar',
    arabic: 'سكر',
    mood: 'Soft and elegant: blush, rose and warm cream',
    dark: false,
    tiles: 'sepia(0.25) saturate(0.7) hue-rotate(-18deg) brightness(1.03)',
    colors: {
      bg: '#fbf2f0',
      surface: '#fffaf9',
      surface2: '#f5e4e1',
      line: '#ebd0cc',
      text: '#3a1d26',
      muted: '#7a5560',
      brand: '#8a3452',
      brand2: '#a04565',
      brandDeep: '#45152a',
      onBrand: '#fff6f4',
      onBrandAccent: '#f8d3dc',
      accent: '#a83a60',
      accentSoft: '#f8dde5',
      warm: '#f3e0d4',
      warm2: '#e8c9b5',
      alert: '#b0202d',
      alertSoft: '#fbe0e2',
      days: ['#8a3452', '#c2627f', '#a0704e'],
      pinText: '#ffffff',
    },
  },
  {
    id: 'lulu',
    name: 'Lulu',
    arabic: 'لؤلؤ',
    mood: 'Calm and premium: pearl, silver and deep sea',
    dark: false,
    tiles: 'grayscale(0.55) contrast(1.02) brightness(1.02)',
    colors: {
      bg: '#eef2f4',
      surface: '#ffffff',
      surface2: '#e1e8ec',
      line: '#cdd7dd',
      text: '#0f2530',
      muted: '#52646d',
      brand: '#123f52',
      brand2: '#1b5470',
      brandDeep: '#071f2a',
      onBrand: '#f3f7f9',
      onBrandAccent: '#c9d6de',
      accent: '#2b6a87',
      accentSoft: '#d9e8f0',
      warm: '#e4e7ea',
      warm2: '#cfd5da',
      alert: '#b3261e',
      alertSoft: '#fde4e1',
      days: ['#123f52', '#3f7f9e', '#7b6a4a'],
      pinText: '#ffffff',
    },
  },
  {
    id: 'ghaf',
    name: 'Ghaf',
    arabic: 'غاف',
    mood: 'Earthy and warm: desert sand, olive and terracotta',
    dark: false,
    tiles: 'sepia(0.35) saturate(0.75) brightness(1.02)',
    colors: {
      bg: '#f5efe4',
      surface: '#fffbf4',
      surface2: '#ece3d2',
      line: '#ddd0b8',
      text: '#2b271c',
      muted: '#685f4c',
      brand: '#4a5628',
      brand2: '#5b6a32',
      brandDeep: '#252c12',
      onBrand: '#faf6ec',
      onBrandAccent: '#ead9b5',
      accent: '#9c4626',
      accentSoft: '#f3dccf',
      warm: '#ead9b8',
      warm2: '#dcc59a',
      alert: '#a3221a',
      alertSoft: '#f9e0d8',
      days: ['#4a5628', '#b0532f', '#7d6233'],
      pinText: '#ffffff',
    },
  },
  {
    id: 'nokhatha',
    name: 'Nokhatha',
    arabic: 'نوخذة',
    mood: "Bold and confident: a dhow captain's navy, brass and gold",
    dark: true,
    tiles: 'invert(1) hue-rotate(200deg) brightness(0.8) contrast(0.95) saturate(0.5)',
    colors: {
      bg: '#0b1324',
      surface: '#121d33',
      surface2: '#1a2742',
      line: '#2c3c5e',
      text: '#eef1f7',
      muted: '#a9b4c9',
      brand: '#17233f',
      brand2: '#22325a',
      brandDeep: '#050a16',
      onBrand: '#f6ead0',
      onBrandAccent: '#d8ae52',
      accent: '#e0b04c',
      accentSoft: '#3b321c',
      warm: '#e9d6a8',
      warm2: '#d6bb7a',
      alert: '#ff8f80',
      alertSoft: '#3e1d24',
      days: ['#e0b04c', '#7fb8da', '#ee9a76'],
      pinText: '#050a16',
    },
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<string, Theme>

const KEY = 'rihla.theme'

export function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved && THEME_BY_ID[saved]) return THEME_BY_ID[saved]
  return matchMedia('(prefers-color-scheme: dark)').matches ? THEME_BY_ID.dark : THEME_BY_ID.light
}

export function applyTheme(t: Theme) {
  const c = t.colors
  const root = document.documentElement
  const vars: Record<string, string> = {
    '--bg': c.bg,
    '--surface': c.surface,
    '--surface-2': c.surface2,
    '--line': c.line,
    '--text': c.text,
    '--muted': c.muted,
    '--color-gulf-950': c.brandDeep,
    '--color-gulf-900': c.brand,
    '--color-gulf-800': c.brand2,
    '--color-pearl': c.onBrand,
    '--color-pearl-2': c.surface2,
    '--color-sand': c.warm,
    '--color-sand-2': c.warm2,
    '--color-lagoon': c.accent,
    '--color-lagoon-2': c.accentSoft,
    '--color-bh': c.alert,
    '--color-bh-soft': c.alertSoft,
    '--on-brand-accent': c.onBrandAccent,
    '--tile-filter': t.tiles,
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.classList.toggle('dark', t.dark)
  root.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.brand)
  localStorage.setItem(KEY, t.id)
}
