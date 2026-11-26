import { PLACE_BY_ID } from '../data/places'
import type { Plan, Prefs } from './planner'

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

/** Calendar file for the trip, starting on the next date that falls on the chosen weekday. */
export function toIcs(plan: Plan): string {
  const today = new Date()
  const first = new Date(today)
  const offset = (plan.days[0].weekday - today.getDay() + 7) % 7 || 7
  first.setDate(today.getDate() + offset)
  const stamp = (d: Date, min: number) => {
    const x = new Date(d)
    x.setHours(Math.floor(min / 60), min % 60, 0, 0)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rihla//Bahrain trip planner//EN', 'X-WR-TIMEZONE:Asia/Bahrain']
  plan.days.forEach((day, i) => {
    const date = new Date(first)
    date.setDate(first.getDate() + i)
    day.stops.forEach((s, j) => {
      const p = PLACE_BY_ID[s.placeId]
      lines.push(
        'BEGIN:VEVENT',
        `UID:rihla-${i}-${j}-${p.id}@rihla`,
        `DTSTAMP:${stamp(today, today.getHours() * 60 + today.getMinutes())}`,
        `DTSTART;TZID=Asia/Bahrain:${stamp(date, s.arrive)}`,
        `DTEND;TZID=Asia/Bahrain:${stamp(date, s.leave)}`,
        `SUMMARY:${p.name}`,
        `LOCATION:${p.name}\\, ${p.area}\\, Bahrain`,
        `GEO:${p.lat};${p.lng}`,
        `DESCRIPTION:${p.tip.replace(/,/g, '\\,')}`,
        'END:VEVENT',
      )
    })
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
