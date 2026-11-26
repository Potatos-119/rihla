// Checks every theme's colour pairs against WCAG 2.1 AA:  npm run contrast
// 4.5:1 for normal text, 3:1 for large text and non-text UI (map routes, pin numbers).
import { THEMES, type ThemeColors } from '../src/lib/themes'

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
/** fg drawn at `alpha` over bg */
const mix = (fg: string, bg: string, alpha: number) => toHex(hex(fg).map((v, i) => v * alpha + hex(bg)[i] * (1 - alpha)))
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** what the page actually paints, per theme mode */
function pairs(c: ThemeColors, dark: boolean): [string, string, string, number][] {
  const tile = dark ? '#2e3236' : '#eceae6' // typical map land colour after the tile filter
  const tip = dark ? mix(c.warm, c.surface, 0.1) : mix(c.warm, c.surface, 0.6)
  const understood = dark ? mix(c.accent, c.bg, 0.15) : mix(c.accentSoft, c.bg, 0.6)
  const whyBg = dark ? c.surface2 : c.brand
  const primary = dark ? [c.brandDeep, c.onBrand] : [c.onBrand, c.brand]
  const p: [string, string, string, number][] = [
    ['body text on page', c.text, c.bg, 4.5],
    ['body text on card', c.text, c.surface, 4.5],
    ['body text on raised surface', c.text, c.surface2, 4.5],
    ['muted text on page', c.muted, c.bg, 4.5],
    ['muted text on card', c.muted, c.surface, 4.5],
    ['muted text on raised surface', c.muted, c.surface2, 4.5],
    ['header text', c.onBrand, c.brand, 4.5],
    ['header tab (75%)', mix(c.onBrand, c.brand, 0.75), c.brand, 4.5],
    ['header tagline (60%)', mix(c.onBrand, c.brand, 0.6), c.brand, 3],
    ['wordmark Arabic (large)', c.onBrandAccent, c.brand, 3],
    ['primary button', primary[0], primary[1], 4.5],
    ['explanation panel text', c.onBrand, whyBg, 4.5],
    ['explanation panel body (80%)', mix(c.onBrand, whyBg, 0.8), whyBg, 4.5],
    ['accent text on card', c.accent, c.surface, 4.5],
    ['accent text on page', c.accent, c.bg, 4.5],
    ['accent on soft accent (Day badge)', c.accent, c.accentSoft, 4.5],
    ['text on soft accent (Free badge)', c.text, c.accentSoft, 4.5],
    ['alert text on card (Remove)', c.alert, c.surface, 4.5],
    ['alert on soft alert (warnings, meal tag)', c.alert, c.alertSoft, 4.5],
    ['text on tip box', c.text, tip, 4.5],
    ['text on "understood" box', c.text, understood, 4.5],
    ['focus ring / accent UI vs card', c.accent, c.surface, 3],
    ['cover text on photo shade', c.onBrand, mix(c.brandDeep, '#808080', 0.85), 4.5],
  ]
  c.days.forEach((d, i) => {
    p.push([`day ${i + 1} route vs map`, d, tile, 3])
    p.push([`day ${i + 1} pin number`, c.pinText, d, 3])
  })
  return p
}

let failures = 0
for (const t of THEMES) {
  const rows = pairs(t.colors, t.dark).map(([label, fg, bg, min]) => {
    const r = ratio(fg, bg)
    if (r < min) failures++
    return { label, r, min }
  })
  const worst = rows.reduce((a, b) => (b.r / b.min < a.r / a.min ? b : a))
  console.log(`\n${t.name.padEnd(9)} lowest: ${worst.label} ${worst.r.toFixed(2)}:1`)
  for (const row of rows) if (row.r < row.min) console.log(`  FAIL ${row.label}: ${row.r.toFixed(2)}:1 (needs ${row.min}:1)`)
}
console.log(failures ? `\n${failures} pair(s) below WCAG AA` : '\nAll themes pass WCAG AA')
process.exit(failures ? 1 : 0)
