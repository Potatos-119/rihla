// Checks that a spending limit makes the plan cheaper, never dearer:  npx tsx scripts/check-limits.ts
import { buildPlan, DEFAULT_PREFS } from '../src/lib/planner'
import { formatRange, total, tripCost } from '../src/lib/cost'

const g = { adults: 2, children: 3 }
const prefs = { ...DEFAULT_PREFS, interests: ['heritage', 'food', 'sea'] as const, ...g, kids: true }
let previous = Infinity
let ok = true
for (const limit of [null, 80, 50, 30]) {
  const plan = buildPlan({ ...prefs, interests: [...prefs.interests], limit })
  const t = total(tripCost(plan, g))
  const mid = (t[0] + t[1]) / 2
  console.log(String(limit).padEnd(5), formatRange(t).padEnd(12), `mid ${mid.toFixed(1)}`, JSON.stringify(plan.pricing ?? null))
  if (mid > previous + 0.01) ok = false
  previous = Math.min(previous, mid)
}
console.log(ok ? 'OK: tighter limits never raise the estimate' : 'FAIL: a tighter limit produced a dearer plan')
process.exit(ok ? 0 : 1)
