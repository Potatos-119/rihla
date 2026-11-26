import { PLACE_BY_ID } from '../data/places'
import type { Plan, Prefs } from './planner'
import type { Group } from './cost'
import { eventText, mapsPlace } from './links'
import { addDays } from './planner'

interface Saved {
  prefs: Prefs
  days: string[][]
}

const KEY = 'rihla.trip.v1'

function pack(prefs: Prefs, plan: Plan): Saved {
  return { prefs, days: plan.days.map((d) => d.stops.map((s) => s.placeId)) }
}

function encode(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode<T>(s: string): T | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
}

function valid(s: Saved | null): s is Saved {
  return !!s && !!s.prefs && Array.isArray(s.days) && s.days.every((d) => d.every((id) => id in PLACE_BY_ID))
}

export function saveLocal(prefs: Prefs, plan: Plan) {
  localStorage.setItem(KEY, JSON.stringify(pack(prefs, plan)))
}

export function loadLocal(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return valid(s) ? s : null
  } catch {
    return null
  }
}

export function shareUrl(prefs: Prefs, plan: Plan): string {
  const url = new URL(window.location.href)
  url.hash = `trip=${encode(pack(prefs, plan))}`
  return url.toString()
}

export function loadFromHash(): Saved | null {
  const m = window.location.hash.match(/trip=([\w-]+)/)
  if (!m) return null
  const s = decode<Saved>(m[1])
  return valid(s) ? s : null
}

/** The calendar date of each trip day: the chosen start date, or else the next matching weekday. */
export function tripDates(plan: Plan): string[] {
  if (plan.days[0]?.date) return plan.days.map((d) => d.date!)
  const today = new Date()
  const offset = (plan.days[0].weekday - today.getDay() + 7) % 7 || 7
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12)
  const iso = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`
  return plan.days.map((_, i) => addDays(iso, i))
}

const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** RFC 5545 lines must be folded at 75 octets. */
function fold(line: string): string {
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) {
      out.push(cur)
      cur = ' ' + ch
    } else cur += ch
  }
  out.push(cur)
  return out.join('\r\n')
}

/** Bahrain is UTC+3 all year, so local minutes convert to UTC by subtracting 3 hours. */
function utc(date: string, min: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCMinutes(min - 180)
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Calendar file for the whole trip, with a reminder 30 minutes before each stop. */
export function toIcs(plan: Plan, group: Group): string {
  const dates = tripDates(plan)
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rihla//Bahrain trip planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Rihla trip to Bahrain', 'X-WR-TIMEZONE:Asia/Bahrain']
  plan.days.forEach((day, i) => {
    day.stops.forEach((s, j) => {
      const p = PLACE_BY_ID[s.placeId]
      const e = eventText(s, group)
      lines.push(
        'BEGIN:VEVENT',
        `UID:rihla-${dates[i]}-${j}-${p.id}@potatos-119.github.io`,
        `DTSTAMP:${now}`,
        `DTSTART:${utc(dates[i], s.arrive)}`,
        `DTEND:${utc(dates[i], s.leave)}`,
        `SUMMARY:${esc(e.title)}`,
        `LOCATION:${esc(e.location)}`,
        `GEO:${p.lat};${p.lng}`,
        `URL:${mapsPlace(p)}`,
        `DESCRIPTION:${esc(e.details)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(e.title)} in 30 minutes`,
        'TRIGGER:-PT30M',
        'END:VALARM',
        'END:VEVENT',
      )
    })
  })
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
