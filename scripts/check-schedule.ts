// Audits thousands of generated plans for timing mistakes:  npm run schedule
// Opening hours and closed days, realistic drives, meals in the right windows at open eateries,
// sunset timing, the end of the day, and unexplained gaps.
import { PLACE_BY_ID, type Interest } from '../src/data/places'
import { BASE, DEFAULT_PREFS, PACE, addDays, buildPlan, driveMinutes, fmt, hoursOn, toMin, WEEKDAYS, type Pace, type Budget, type Prefs } from '../src/lib/planner'

const problems = new Map<string, string[]>()
const tally = new Map<string, number>()
const flag = (kind: string, example: string) => {
  tally.set(kind, (tally.get(kind) ?? 0) + 1)
  const list = problems.get(kind) ?? []
  if (list.length < 4) list.push(example)
  problems.set(kind, list)
  count++
}
let count = 0
let plans = 0

// known legs, door to door including parking (minutes)
const legs: [string, string, number, number][] = [
  ['BASE', 'museum', 8, 16],
  ['BASE', 'siyadi', 14, 28],
  ['BASE', 'tree', 30, 55],
  ['BASE', 'areen', 30, 55],
  ['BASE', 'circuit', 28, 50],
  ['bab', 'souq', 5, 8],
  ['museum', 'bumaher', 10, 22],
]
for (const [a, b, lo, hi] of legs) {
  const pa = a === 'BASE' ? BASE : PLACE_BY_ID[a]
  const t = driveMinutes(pa, PLACE_BY_ID[b])
  if (t < lo || t > hi) flag('drive time unrealistic', `${a} → ${b}: ${t} min (expected ${lo}–${hi})`)
}

const interestSets: Interest[][] = [['heritage', 'food', 'sea'], ['nature', 'family'], ['shopping', 'crafts', 'modern'], ['heritage']]
const paces: Pace[] = ['relaxed', 'balanced', 'packed']
const budgets: Budget[] = ['free', 'low', 'any']
const starts = ['07:30', '09:00', '11:00']
// one week of start dates, so every weekday (Friday included) is day 1 at least once
const dates = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-06-19']

for (const days of [1, 2, 3])
  for (const pace of paces)
    for (const budget of budgets)
      for (const meals of [true, false])
        for (const adults of [1, 2, 6])
          for (const interests of interestSets)
            for (const date of dates)
              for (const start of starts) {
                const prefs: Prefs = { ...DEFAULT_PREFS, days, pace, budget, meals, adults, children: adults === 6 ? 2 : 0, interests, date, start }
                const plan = buildPlan(prefs)
                plans++
                const tag = `${days}d ${pace} ${budget} meals:${meals} ${date} start ${start} [${interests.join(',')}]`
                plan.days.forEach((day, di) => {
                  const dname = `${tag} day ${di + 1} (${WEEKDAYS[day.weekday]})`
                  if (day.date !== addDays(date, di)) flag('wrong date', dname)
                  let prevLeave = toMin(start) - PACE[pace].buffer
                  let pos: { lat: number; lng: number } = BASE
                  const had: string[] = []
                  day.stops.forEach((s) => {
                    const p = PLACE_BY_ID[s.placeId]
                    const h = hoursOn(p, day.weekday)
                    if (!h) flag('visited on a closed day', `${dname}: ${p.name}`)
                    else if (s.arrive < h[0] || s.leave > h[1]) flag('outside opening hours', `${dname}: ${p.name} ${fmt(s.arrive)}–${fmt(s.leave)}, open ${fmt(h[0])}–${fmt(h[1])}`)
                    const drive = driveMinutes(pos, p)
                    if (s.travel !== drive) flag('travel time mismatch', `${dname}: ${p.name}`)
                    if (s.arrive < prevLeave + PACE[pace].buffer + drive) flag('impossible back-to-back', `${dname}: ${p.name} at ${fmt(s.arrive)}`)
                    const gap = s.arrive - (prevLeave + PACE[pace].buffer + drive)
                    if (gap !== (s.idle ?? 0)) flag('unexplained gap', `${dname}: ${gap} min before ${p.name}, idle ${s.idle ?? 0}`)
                    if (gap > 150 && s.meal !== 'dinner') flag('gap over 2.5 hours', `${dname}: ${gap} min before ${p.name}`)
                    if (s.meal) {
                      had.push(s.meal)
                      if (!p.meals?.includes(s.meal)) flag('meal at a place that does not serve it', `${dname}: ${s.meal} at ${p.name}`)
                      const [lo, hi] = { breakfast: [360, 630], lunch: [705, 900], dinner: [1120, 1290] }[s.meal]
                      if (s.arrive < lo || s.arrive > hi) flag(`${s.meal} at an odd time`, `${dname}: ${fmt(s.arrive)} at ${p.name}`)
                    }
                    if (s.reasons.includes('Timed for sunset') && (s.arrive < day.sunset - 100 || s.arrive > day.sunset - 25))
                      flag('sunset spot mistimed', `${dname}: ${p.name} at ${fmt(s.arrive)}, sunset ${fmt(day.sunset)}`)
                    prevLeave = s.leave
                    pos = p
                  })
                  const end = toMin(prefs.end)
                  const last = day.stops.at(-1)
                  if (last && last.leave > end) flag('day runs past its end', `${dname}: ${fmt(last.leave)}`)
                  if (meals && day.stops.length) {
                    if (toMin(start) <= 720 && !had.includes('lunch')) flag('no lunch', dname)
                    if (end >= 1230 && !had.includes('dinner')) flag('no dinner', dname)
                    if (toMin(start) <= 480 && !had.includes('breakfast')) flag('no breakfast on an early start', dname)
                  }
                  if (!meals && had.length) flag('meal added with meals off', dname)
                })
              }

console.log(`Audited ${plans} plans.`)
if (!count) {
  console.log('No problems found.')
  process.exit(0)
}
for (const [kind, ex] of problems) {
  console.log(`\n${kind} (${tally.get(kind)}):`)
  for (const e of ex) console.log('  ' + e)
}
console.log(`\n${count} problem(s).`)
process.exit(1)
