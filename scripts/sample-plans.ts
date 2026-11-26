// Prints sample itineraries so planner changes can be eyeballed: npx tsx scripts/sample-plans.ts
import { buildPlan, DEFAULT_PREFS, fmt, zone, type Prefs } from '../src/lib/planner'
import { PLACE_BY_ID } from '../src/data/places'

const cases: [string, Partial<Prefs>][] = [
  ['default', {}],
  ['kids weekend, low budget', { weekday: 5, interests: ['heritage', 'sea', 'shopping'], kids: true, budget: 'low' }],
  ['1 day nature, relaxed', { days: 1, interests: ['nature'], pace: 'relaxed' }],
  ['3 days packed, everything', { days: 3, pace: 'packed', interests: ['heritage', 'food', 'crafts', 'modern', 'sea', 'nature'] }],
  ['free only', { budget: 'free', interests: ['heritage', 'crafts'] }],
]
for (const [name, c] of cases) {
  const plan = buildPlan({ ...DEFAULT_PREFS, ...c })
  console.log(`\n=== ${name}`)
  for (const d of plan.days) {
    console.log(` Day ${d.index + 1}`)
    for (const s of d.stops) console.log(`   ${fmt(s.arrive).padEnd(8)} ${PLACE_BY_ID[s.placeId].name} [${zone(PLACE_BY_ID[s.placeId])}] ${s.meal ?? ''} (${s.travel}m)`)
  }
  console.log(' skipped:', plan.skipped.map((s) => `${s.placeId}: ${s.reason}`).join('; '))
}
