import { PLACES, PLACE_BY_ID, type Interest, type Meal, type Place } from '../data/places'
import { midPerPerson, total, tripCost } from './cost'

export type Pace = 'relaxed' | 'balanced' | 'packed'
export type Budget = 'free' | 'low' | 'any'

export interface Prefs {
  days: number
  /** first day of the trip, YYYY-MM-DD; when set, it decides the weekday */
  date: string | null
  /** weekday of day 1, 0 = Sunday … 6 = Saturday */
  weekday: number
  start: string
  end: string
  interests: Interest[]
  pace: Pace
  budget: Budget
  kids: boolean
  meals: boolean
  adults: number
  children: number
  /** optional spending limit for the whole trip and group, in BD */
  limit: number | null
}

export const DEFAULT_PREFS: Prefs = {
  days: 2,
  date: null,
  weekday: 6,
  start: '09:00',
  end: '21:00',
  interests: ['heritage', 'food', 'sea'],
  pace: 'balanced',
  budget: 'any',
  kids: false,
  meals: true,
  adults: 2,
  children: 0,
  limit: null,
}

export interface Stop {
  placeId: string
  arrive: number
  leave: number
  travel: number
  meal?: Meal
  /** minutes spent waiting before setting off (for an opening time, or free time before dinner) */
  idle?: number
  reasons: string[]
  warnings: string[]
}

export interface Day {
  index: number
  weekday: number
  /** YYYY-MM-DD when the trip has a start date */
  date: string | null
  /** sunset in minutes after midnight, Bahrain time */
  sunset: number
  stops: Stop[]
}

export interface Skipped {
  placeId: string
  reason: string
}

export interface Plan {
  days: Day[]
  skipped: Skipped[]
  /** how the spending limit shaped the plan, when one was set */
  pricing?: { tries: number; weight: number; fits: boolean }
}

/** Where every day starts: a central Manama hotel. */
export const BASE = { name: 'your hotel in Manama', lat: 26.2285, lng: 50.586 }

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const PACE = {
  relaxed: { maxStops: 4, buffer: 20, stay: 1.15 },
  balanced: { maxStops: 6, buffer: 10, stay: 1 },
  packed: { maxStops: 8, buffer: 5, stay: 0.85 },
} as const

const LABEL: Record<Interest, string> = {
  heritage: 'Heritage',
  food: 'Food',
  nature: 'Nature',
  sea: 'Sea & beaches',
  modern: 'Modern Bahrain',
  family: 'Family & kids',
  shopping: 'Souqs & malls',
  crafts: 'Crafts',
}

const MEAL_WINDOW: Record<Meal, [number, number]> = {
  breakfast: [toMin('07:00'), toMin('10:30')],
  lunch: [toMin('12:15'), toMin('15:00')],
  dinner: [toMin('19:00'), toMin('21:30')],
}

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function fmt(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = Math.round(min % 60)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Straight-line distance in km. */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Minutes for parking and walking to the entrance, added to every drive. */
export const PARKING = 7

/**
 * Estimated door-to-door minutes between two points in Bahrain.
 * Roads run about 35% longer than a straight line. Short urban hops average ~28 km/h, mid-range
 * trips ~40 km/h and long highway runs south (Sakhir, Al Areen, the Tree of Life) ~60 km/h.
 * Crossing a causeway to or from Muharraq adds a few minutes of junctions and traffic.
 */
export function driveMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const d = km(a, b)
  if (d < 0.6) return 5 // walk
  const road = d * 1.35
  const speed = road < 6 ? 28 : road < 18 ? 40 : 60
  const causeway = (zone(a) === 'Muharraq') !== (zone(b) === 'Muharraq') ? 5 : 0
  return Math.round((road / speed) * 60 + causeway + PARKING)
}

function affordable(p: Place, budget: Budget): boolean {
  if (budget === 'free') return p.cost === 0 || (p.meals !== undefined && p.cost <= 1)
  if (budget === 'low') return p.cost <= 1 || (p.meals !== undefined && p.cost <= 2)
  return true
}

function isFoodOnly(p: Place): boolean {
  return p.tags[0] === 'food'
}

export function matches(p: Place, prefs: Prefs): Interest[] {
  return p.tags.filter((t) => prefs.interests.includes(t) || (prefs.kids && t === 'family'))
}

/** How much the user would want this place, before thinking about time or distance. */
function appeal(p: Place, prefs: Prefs): number {
  const m = matches(p, prefs)
  let s = m.length * 3 + p.rating * 0.9
  if (m.length === 0) s -= 4
  if (prefs.kids && p.tags.includes('family')) s += 1.5
  if (prefs.budget !== 'any' && p.cost === 0) s += 1
  return s
}

/** Rough parts of the island; changing part costs time a straight-line estimate underrates. */
export function zone(p: { lat: number; lng: number }): string {
  if (p.lat > 26.235 && p.lng > 50.605) return 'Muharraq'
  if (p.lat < 26.18) return 'South'
  if (p.lng < 50.565) return 'West'
  return 'Manama'
}

/** Opening hours on a given weekday, in minutes, or null when closed that day. */
export function hoursOn(p: Place, weekday: number): [number, number] | null {
  if (p.closedDays?.includes(weekday)) return null
  const special = p.hours?.[weekday]
  if (special === null) return null
  const [o, c] = special ?? [p.open, p.close]
  return [toMin(o), toMin(c)]
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00`).getDay()
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Sunset in Manama (26.22 N, 50.58 E, UTC+3) for a date, in minutes after midnight.
 * NOAA's simplified solar equations; accurate to a couple of minutes.
 * Without a date, uses mid-November, when most visitors come.
 */
export function sunsetMinutes(date: string | null): number {
  const d = date ? new Date(`${date}T12:00:00Z`) : new Date(Date.UTC(2026, 10, 15, 12))
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const n = Math.floor((d.getTime() - start) / 86400000)
  const g = ((2 * Math.PI) / 365) * (n - 1)
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const lat = (26.22 * Math.PI) / 180
  const ha = Math.acos(Math.cos((90.833 * Math.PI) / 180) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl))
  const utc = 720 - 4 * (50.58 - (ha * 180) / Math.PI) - eqt
  return Math.round(utc + 180)
}

interface Fit {
  arrive: number
  leave: number
  travel: number
}

/** Earliest sensible time to sit down for each meal. */
const MEAL_EARLIEST: Record<Meal, number> = { breakfast: toMin('06:30'), lunch: toMin('12:00'), dinner: toMin('18:45') }
/** How long a meal stop takes, whatever the venue (a mall's 2-hour visit is not a 2-hour lunch). */
export const MEAL_MINUTES: Record<Meal, number> = { breakfast: 45, lunch: 60, dinner: 75 }

function fit(p: Place, from: { lat: number; lng: number }, now: number, prefs: Prefs, weekday: number, meal?: Meal): Fit | string {
  const h = hoursOn(p, weekday)
  if (!h) return `closed on ${WEEKDAYS[weekday]}s`
  const travel = driveMinutes(from, p)
  let arrive = now + travel
  const [open, close] = h
  if (arrive < open) {
    if (open - arrive > 40) return `opens at ${fmt(open)}`
    arrive = open
  }
  if (meal && arrive < MEAL_EARLIEST[meal]) arrive = MEAL_EARLIEST[meal]
  if (meal && arrive > MEAL_WINDOW[meal][1]) return `too late for ${meal}`
  const leave = arrive + (meal ? MEAL_MINUTES[meal] : Math.round(p.minutes * PACE[prefs.pace].stay))
  if (leave > close) return `closes at ${fmt(close)}`
  if (leave > toMin(prefs.end)) return 'does not fit before your day ends'
  return { arrive, leave, travel }
}

function reasonsFor(p: Place, prefs: Prefs, f: Fit, meal: Meal | undefined, sunset: boolean, first: boolean): string[] {
  const r: string[] = []
  const m = matches(p, prefs)
  if (meal) r.push(`Fills your ${meal} slot`)
  if (m.length) r.push(`Matches ${m.map((t) => LABEL[t]).join(', ')}`)
  if (p.rating >= 5) r.push('A top pick for first-time visitors')
  if (sunset) r.push('Timed for sunset')
  r.push(
    first
      ? `${f.travel} min from ${BASE.name}`
      : f.travel <= 8
        ? 'Walking distance or a short hop from the last stop'
        : `${f.travel} min drive from the last stop`,
  )
  if (p.cost === 0) r.push('Free to enter')
  return r
}

/**
 * Plan the trip. With a spending limit, re-plan with a growing price penalty
 * until the estimated (mid-point) total fits, or the penalty tops out.
 */
export function buildPlan(input: Prefs): Plan {
  const prefs = { ...input, kids: input.kids || input.children > 0, weekday: input.date ? weekdayOf(input.date) : input.weekday }
  const first = greedy(prefs, 0)
  if (!prefs.limit) return first
  const group = { adults: prefs.adults, children: prefs.children }
  const mid = (p: Plan) => {
    const t = total(tripCost(p, group))
    return (t[0] + t[1]) / 2
  }
  if (mid(first) <= prefs.limit) return { ...first, pricing: { tries: 1, weight: 0, fits: true } }
  // keep the cheapest attempt: a stronger penalty can free up time for an extra (paid) meal
  let best = { plan: first, cost: mid(first), weight: 0 }
  let tries = 1
  for (const w of [0.5, 1, 2, 4]) {
    tries++
    const p = greedy(prefs, w)
    const c = mid(p)
    if (c < best.cost) best = { plan: p, cost: c, weight: w }
    if (c <= prefs.limit) return { ...p, pricing: { tries, weight: w, fits: true } }
  }
  return { ...best.plan, pricing: { tries, weight: best.weight, fits: false } }
}

/** Greedy planner: at each step pick the stop with the best appeal after time, distance, meal and price rules. */
function greedy(prefs: Prefs, priceWeight: number): Plan {
  const pace = PACE[prefs.pace]
  const used = new Set<string>()
  const days: Day[] = []
  const rejected = new Map<string, string>()

  for (let d = 0; d < prefs.days; d++) {
    const weekday = (prefs.weekday + d) % 7
    const date = prefs.date ? addDays(prefs.date, d) : null
    const sunsetAt = sunsetMinutes(date)
    let now = toMin(prefs.start)
    let idle = 0
    let pos: { lat: number; lng: number } = BASE
    const stops: Stop[] = []
    const had = new Set<Meal>()

    let sights = 0
    const dinnerPending = () => prefs.meals && !had.has('dinner') && toMin(prefs.end) >= MEAL_WINDOW.dinner[0] + MEAL_MINUTES.dinner
    /** jump forward to the next meal still to come today, as free time; false when there is none */
    const restUntilMeal = (): boolean => {
      if (!prefs.meals) return false
      for (const m of ['lunch', 'dinner'] as Meal[]) {
        const at = MEAL_WINDOW[m][0] - (m === 'lunch' ? 50 : 20)
        if (!had.has(m) && now < at && (m === 'lunch' || dinnerPending())) {
          idle += at - now
          now = at
          return true
        }
      }
      return false
    }
    while (sights < pace.maxStops || (prefs.meals && !had.has('dinner') && now < MEAL_WINDOW.dinner[1])) {
      const due = prefs.meals
        ? (['breakfast', 'lunch', 'dinner'] as Meal[]).find((m) => {
            if (had.has(m)) return false
            const [from, to] = MEAL_WINDOW[m]
            if (m === 'breakfast') return now < from + 60 && stops.length === 0
            // look ahead: a long visit starting now could swallow the whole meal window
            return now + (m === 'lunch' ? 50 : 20) >= from && now + 15 < to
          })
        : undefined

      let best: { p: Place; f: Fit; score: number; sunset: boolean } | null = null
      for (const p of PLACES) {
        // a meal may go back to an eatery from an earlier day (never the same day), at a small
        // penalty so somewhere new wins when it fits; on a spending limit there is no penalty
        const today = stops.some((x) => x.placeId === p.id)
        const repeat = used.has(p.id)
        if (repeat && !(due && !today)) continue
        if (!affordable(p, prefs.budget)) {
          rejected.set(p.id, 'over your budget')
          continue
        }
        if (due && !p.meals?.includes(due)) continue
        if (!due && isFoodOnly(p)) continue
        if (!due && sights >= pace.maxStops) continue
        const f = fit(p, pos, now, prefs, weekday, due)
        if (typeof f === 'string') {
          if (!rejected.has(p.id) && !repeat) rejected.set(p.id, f)
          continue
        }
        // keep room for dinner: a sight must end early enough to drive to dinner and eat before the day ends
        // (the far south has few eateries, so allow a longer drive from there)
        const reach = zone(p) === 'South' ? 60 : 45
        if (!due && dinnerPending() && f.leave > Math.min(toMin(prefs.end) - MEAL_MINUTES.dinner - reach, MEAL_WINDOW.dinner[1] - reach)) continue
        // and for lunch: a long visit must not run past the point where lunch is still reachable
        if (!due && prefs.meals && !had.has('lunch') && toMin(prefs.start) <= MEAL_WINDOW.lunch[0] && f.leave > MEAL_WINDOW.lunch[1] - reach) continue
        // be there for the last hour or so of light before sunset
        const sunset = !!p.sunset && f.arrive >= sunsetAt - 100 && f.arrive <= sunsetAt - 25
        let score = appeal(p, prefs) - f.travel * 0.2 - Math.max(0, f.arrive - now - f.travel) * 0.05
        if (stops.length > 0 && zone(p) !== zone(pos)) score -= 3.5
        // keep places that double as restaurants for the meal they serve
        if (!due && prefs.meals && p.meals?.length) score -= 1.5
        if (sunset) score += 2.5
        if (priceWeight) score -= priceWeight * midPerPerson(p, due)
        if (repeat && !priceWeight) score -= 4
        if (p.sunset && !sunset && p.outdoor && f.arrive >= toMin('11:30') && f.arrive <= toMin('15:00')) score -= 1.5
        if (!best || score > best.score) best = { p, f, score, sunset }
      }

      if (!best) {
        if (!due && restUntilMeal()) continue
        if (due) {
          had.add(due)
          continue
        }
        break
      }
      // stop adding sightseeing that nobody asked for once the day has its core
      if (!due && matches(best.p, prefs).length === 0 && sights >= 3) {
        if (restUntilMeal()) continue
        break
      }

      const meal = due
      if (meal) had.add(meal)
      else sights++
      used.add(best.p.id)
      rejected.delete(best.p.id)
      stops.push({
        placeId: best.p.id,
        arrive: best.f.arrive,
        leave: best.f.leave,
        travel: best.f.travel,
        meal,
        idle: idle + Math.max(0, best.f.arrive - best.f.travel - now),
        reasons: [
          ...reasonsFor(best.p, prefs, best.f, meal, best.sunset, stops.length === 0),
          ...(priceWeight && midPerPerson(best.p, meal) < 3 ? ['A lower-cost choice, to fit your spending limit'] : []),
          ...(meal && days.some((x) => x.stops.some((y) => y.placeId === best!.p.id)) ? ['Back to a favourite: nothing new serves ' + meal + ' nearby at this time'] : []),
        ],
        warnings: [],
      })
      now = best.f.leave + pace.buffer
      pos = best.p
      idle = 0
    }
    days.push({ index: d, weekday, date, sunset: sunsetAt, stops })
  }

  const skipped: Skipped[] = []
  for (const [id, reason] of rejected) {
    if (used.has(id)) continue
    const p = PLACE_BY_ID[id]
    if (matches(p, prefs).length) skipped.push({ placeId: id, reason })
  }
  skipped.sort((a, b) => PLACE_BY_ID[b.placeId].rating - PLACE_BY_ID[a.placeId].rating)
  return { days, skipped: skipped.slice(0, 6) }
}

/**
 * Re-time a day after the user edits it (reorder, add, remove, swap).
 * Keeps the user's order and reports problems instead of silently fixing them.
 */
export function retime(day: Day, prefs: Prefs): Day {
  const pace = PACE[prefs.pace]
  let now = toMin(prefs.start)
  let pos: { lat: number; lng: number } = BASE
  const stops = day.stops.map((s, i) => {
    const p = PLACE_BY_ID[s.placeId]
    const travel = driveMinutes(pos, p)
    let arrive = now + travel
    const h = hoursOn(p, day.weekday)
    const [open, close] = h ?? [toMin(p.open), toMin(p.close)]
    const warnings: string[] = []
    const wait = Math.max(0, open - arrive)
    if (arrive < open) arrive = open
    const leave = arrive + (s.meal ? MEAL_MINUTES[s.meal] : Math.round(p.minutes * pace.stay))
    if (!h) warnings.push(`Closed on ${WEEKDAYS[day.weekday]}s`)
    else if (leave > close) warnings.push(`Closes at ${fmt(close)}; you would still be there`)
    if (leave > toMin(prefs.end)) warnings.push('Runs past the end of your day')
    now = leave + pace.buffer
    pos = p
    const kept = s.reasons.filter((r) => !/min (drive )?from|short hop/.test(r))
    kept.push(
      i === 0
        ? `${travel} min from ${BASE.name}`
        : travel <= 8
          ? 'Walking distance or a short hop from the last stop'
          : `${travel} min drive from the last stop`,
    )
    return { ...s, arrive, leave, travel, idle: wait, warnings, reasons: kept }
  })
  return { ...day, stops }
}

/** Best unused places that would fit in place of the stop at `index`. */
export function alternatives(plan: Plan, dayIndex: number, index: number, prefs: Prefs): Place[] {
  const day = plan.days[dayIndex]
  const current = PLACE_BY_ID[day.stops[index].placeId]
  const used = new Set(plan.days.flatMap((d) => d.stops.map((s) => s.placeId)))
  const prev = index === 0 ? BASE : PLACE_BY_ID[day.stops[index - 1].placeId]
  const now = index === 0 ? toMin(prefs.start) : day.stops[index - 1].leave + PACE[prefs.pace].buffer
  const meal = day.stops[index].meal
  return PLACES.filter((p) => !used.has(p.id) && affordable(p, prefs.budget))
    .filter((p) => (meal ? p.meals?.includes(meal) : !isFoodOnly(p)))
    .map((p) => ({ p, f: fit(p, prev, now, prefs, day.weekday) }))
    .filter((x) => typeof x.f !== 'string')
    .map((x) => ({ p: x.p, score: appeal(x.p, prefs) - (x.f as Fit).travel * 0.2 - (zone(x.p) !== zone(current) ? 3.5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p)
    .filter((p) => p.id !== current.id)
}

export function makeStop(placeId: string, prefs: Prefs, meal?: Meal): Stop {
  const p = PLACE_BY_ID[placeId]
  const m = matches(p, prefs)
  const reasons = ['You added this yourself']
  if (meal) reasons.unshift(`Fills your ${meal} slot`)
  if (m.length) reasons.push(`Matches ${m.map((t) => LABEL[t]).join(', ')}`)
  return { placeId, arrive: 0, leave: 0, travel: 0, meal, reasons, warnings: [] }
}

export function interestLabel(i: Interest) {
  return LABEL[i]
}
