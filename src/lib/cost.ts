import { PLACE_BY_ID, type Meal, type Place, type Range } from '../data/places'
import type { Day, Plan, Stop } from './planner'

export interface Group {
  adults: number
  children: number
}

/** Children are assumed to eat about 60% of an adult portion. */
export const CHILD_FOOD_SHARE = 0.6

export interface Breakdown {
  food: Range
  entry: Range
  other: Range
}

const ZERO: Range = [0, 0]
const add = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]]
const times = (r: Range, n: number): Range => [r[0] * n, r[1] * n]

export const total = (b: Breakdown): Range => add(add(b.food, b.entry), b.other)
export const people = (g: Group) => g.adults + g.children

/** Estimated spend for one visit by the whole group. */
export function placeCost(p: Place, meal: Meal | undefined, g: Group): Breakdown {
  const food = meal && p.spend?.[meal] ? times(p.spend[meal]!, g.adults + g.children * CHILD_FOOD_SHARE) : ZERO
  const entry = p.entry ? add(times(p.entry.adult, g.adults), times(p.entry.child, g.children)) : ZERO
  const other = p.extra ? add(times(p.extra.adult, g.adults), times(p.extra.child, g.children)) : ZERO
  return { food, entry, other }
}

export function stopCost(s: Stop, g: Group): Breakdown {
  return placeCost(PLACE_BY_ID[s.placeId], s.meal, g)
}

function sum(parts: Breakdown[]): Breakdown {
  return parts.reduce((acc, b) => ({ food: add(acc.food, b.food), entry: add(acc.entry, b.entry), other: add(acc.other, b.other) }), {
    food: ZERO,
    entry: ZERO,
    other: ZERO,
  })
}

export const dayCost = (d: Day, g: Group) => sum(d.stops.map((s) => stopCost(s, g)))
export const tripCost = (p: Plan, g: Group) => sum(p.days.map((d) => dayCost(d, g)))

/** Mid-point cost per person of a visit, used by the planner to prefer cheaper options. */
export function midPerPerson(p: Place, meal: Meal | undefined): number {
  const b = placeCost(p, meal, { adults: 1, children: 0 })
  const t = total(b)
  return (t[0] + t[1]) / 2
}

function money(n: number): string {
  if (n === 0) return '0'
  if (n < 10) return (Math.round(n * 2) / 2).toString().replace(/\.0$/, '')
  return Math.round(n).toString()
}

/** "BD 3–6", "BD 15" or "Free". */
export function formatRange(r: Range): string {
  if (r[1] === 0) return 'Free'
  const lo = money(r[0])
  const hi = money(r[1])
  return lo === hi ? `BD ${hi}` : `BD ${lo}–${hi}`
}

export function groupLabel(g: Group): string {
  const a = `${g.adults} adult${g.adults === 1 ? '' : 's'}`
  if (!g.children) return a
  return `${a} and ${g.children} child${g.children === 1 ? '' : 'ren'}`
}

export function peopleLabel(g: Group): string {
  const n = people(g)
  return n === 1 ? 'for 1 person' : `for ${n} people`
}
