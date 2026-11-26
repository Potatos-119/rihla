import { PLACE_BY_ID } from '../data/places'
import { formatRange, peopleLabel, stopCost, total, type Group } from './cost'
import { BASE, fmt, type Day, type Stop } from './planner'

type Point = { lat: number; lng: number }

export const mapsPlace = (p: Point) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`

export const mapsDirections = (from: Point, to: Point) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`

/** Where a stop's leg starts: the hotel for the first stop, else the previous stop. */
export function legStart(day: Day, index: number): Point & { name: string } {
  if (index === 0) return BASE
  const p = PLACE_BY_ID[day.stops[index - 1].placeId]
  return p
}

const pad = (n: number) => String(n).padStart(2, '0')
const compact = (date: string, min: number) => `${date.replace(/-/g, '')}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`
const iso = (date: string, min: number) => `${date}T${pad(Math.floor(min / 60))}:${pad(min % 60)}:00+03:00`

export interface EventText {
  title: string
  location: string
  details: string
}

export function eventText(stop: Stop, group: Group): EventText {
  const p = PLACE_BY_ID[stop.placeId]
  const cost = total(stopCost(stop, group))
  const title = stop.meal ? `${stop.meal[0].toUpperCase() + stop.meal.slice(1)} at ${p.name}` : p.name
  return {
    title,
    location: `${p.name}, ${p.area}, Bahrain (${p.lat}, ${p.lng})`,
    details: [
      `${fmt(stop.arrive)} to ${fmt(stop.leave)}. Estimated ${formatRange(cost)} ${peopleLabel(group)}.`,
      p.tip,
      `Map: ${mapsPlace(p)}`,
      'Planned with Rihla: https://potatos-119.github.io/rihla/',
    ].join('\n\n'),
  }
}

/** One-tap Google Calendar link for a single stop (Google adds its own default reminder). */
export function googleLink(stop: Stop, date: string, group: Group): string {
  const e = eventText(stop, group)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${compact(date, stop.arrive)}/${compact(date, stop.leave)}`,
    details: e.details,
    location: e.location,
    ctz: 'Asia/Bahrain',
  })
  return `https://calendar.google.com/calendar/render?${q}`
}

/** Outlook on the web: personal (outlook.live.com) or work and school (outlook.office.com). */
export function outlookLink(stop: Stop, date: string, group: Group, kind: 'live' | 'office'): string {
  const e = eventText(stop, group)
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: iso(date, stop.arrive),
    enddt: iso(date, stop.leave),
    body: e.details,
    location: e.location,
  })
  return `https://outlook.${kind}.com/calendar/0/deeplink/compose?${q}`
}
