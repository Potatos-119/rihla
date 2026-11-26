// Prints sample itineraries and cost estimates so planner changes can be eyeballed:
//   npm run sample
import { buildPlan, DEFAULT_PREFS, fmt, zone, type Prefs } from '../src/lib/planner'
import { parseRequest, EXAMPLES } from '../src/lib/parse'
import { dayCost, formatRange, stopCost, total, tripCost } from '../src/lib/cost'
import { PLACE_BY_ID } from '../src/data/places'

const cases: [string, Partial<Prefs>][] = [
  ['default (2 adults)', {}],
  ['family of 5, weekend, low budget', { weekday: 5, interests: ['heritage', 'sea', 'shopping'], adults: 2, children: 3, budget: 'low' }],
  ['1 day nature, relaxed', { days: 1, interests: ['nature'], pace: 'relaxed', adults: 1 }],
  ['4 friends, modern + food + sea, no limit', { days: 1, interests: ['modern', 'food', 'sea'], adults: 4 }],
  ['4 friends, modern + food + sea, limit BD 60', { days: 1, interests: ['modern', 'food', 'sea'], adults: 4, limit: 60 }],
]
for (const [name, c] of cases) {
  const prefs = { ...DEFAULT_PREFS, ...c }
  const plan = buildPlan(prefs)
  const g = { adults: prefs.adults, children: prefs.children }
  console.log(`\n=== ${name}${plan.pricing ? ` (pricing: ${JSON.stringify(plan.pricing)})` : ''}`)
  for (const d of plan.days) {
    console.log(` Day ${d.index + 1}  ≈ ${formatRange(total(dayCost(d, g)))}`)
    for (const s of d.stops)
      console.log(`   ${fmt(s.arrive).padEnd(8)} ${PLACE_BY_ID[s.placeId].name} [${zone(PLACE_BY_ID[s.placeId])}] ${s.meal ?? ''} ${formatRange(total(stopCost(s, g)))}`)
  }
  const t = tripCost(plan, g)
  console.log(` TRIP ≈ ${formatRange(total(t))}  food ${formatRange(t.food)} entry ${formatRange(t.entry)} other ${formatRange(t.other)}`)
}

console.log('\n=== parser')
for (const ex of [...EXAMPLES, 'family of 5 for 2 days, history', 'just me, one day, max 20 bd']) {
  const r = parseRequest(ex, DEFAULT_PREFS)
  console.log(`"${ex}"\n   → ${r.understood.map((u) => u.label).join(' | ')}`)
}
