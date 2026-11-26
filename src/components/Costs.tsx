import { useState } from 'react'
import { AlertTriangle, ChevronDown, Info, Repeat2, Wallet } from 'lucide-react'
import type { Place } from '../data/places'
import { CHILD_FOOD_SHARE, formatRange, groupLabel, people, peopleLabel, total, tripCost, type Group } from '../lib/cost'
import type { Plan, Prefs } from '../lib/planner'
import { Stepper } from './bits'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const checkedOn = (iso: string) => DATE.format(new Date(`${iso}T12:00:00`))

/** "Checked 26 Nov 2026 · source" with an approximate flag where facts could not be confirmed. */
export function SourceLine({ place, className = '' }: { place: Place; className?: string }) {
  const host = new URL(place.source).hostname.replace(/^www\./, '')
  return (
    <p className={`muted text-xs ${className}`}>
      Checked {checkedOn(place.checked)} against{' '}
      <a href={place.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {host}
      </a>
      {place.approx?.length ? `. Approximate: ${place.approx.map((a) => (a === 'coords' ? 'map position' : a)).join(', ')}.` : '.'}
    </p>
  )
}

interface SummaryProps {
  plan: Plan
  prefs: Prefs
  onGroup: (g: Group) => void
  onLimit: (limit: number | null) => void
  onRefit: () => void
}

export function CostSummary({ plan, prefs, onGroup, onLimit, onRefit }: SummaryProps) {
  const g: Group = { adults: prefs.adults, children: prefs.children }
  const b = tripCost(plan, g)
  const t = total(b)
  const mid = (t[0] + t[1]) / 2
  const n = people(g)
  const [how, setHow] = useState(false)
  const limit = prefs.limit
  const over = limit !== null && mid > limit
  const fill = limit ? Math.min(100, (mid / limit) * 100) : 0

  return (
    <section className="surface hairline rounded-2xl border p-4" aria-labelledby="cost-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="cost-title" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Wallet size={18} className="text-lagoon" /> Estimated spend
          </h3>
          <p className="mt-0.5 font-display text-[1.7rem] leading-tight font-semibold tabular-nums">
            ≈ {formatRange(t)} <span className="text-base font-normal muted">{peopleLabel(g)}</span>
          </p>
          {n > 1 && t[1] > 0 && (
            <p className="muted text-sm tabular-nums">About {formatRange([t[0] / n, t[1] / n])} per person</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 no-print">
        <div>
          <p className="mb-1 text-xs font-semibold">Adults</p>
          <Stepper label="Adults" value={g.adults} min={1} max={12} onChange={(v) => onGroup({ ...g, adults: v })} />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold">Children</p>
          <Stepper label="Children" value={g.children} min={0} max={10} onChange={(v) => onGroup({ ...g, children: v })} />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
        <dt className="muted">Food and drinks</dt>
        <dd>{formatRange(b.food)}</dd>
        <dt className="muted">Entry fees</dt>
        <dd>{formatRange(b.entry)}</dd>
        <dt className="muted">Activities</dt>
        <dd>{formatRange(b.other)}</dd>
      </dl>

      <div className="mt-3 border-t pt-3 hairline">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Spending limit</span>
          <span className="surface hairline ml-auto flex w-32 items-center gap-1 rounded-lg border px-2 py-1 focus-within:border-lagoon focus-within:ring-2 focus-within:ring-lagoon/30">
            <span className="muted">BD</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={5}
              placeholder="None"
              value={limit ?? ''}
              onChange={(e) => onLimit(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
              className="w-full bg-transparent text-right outline-none focus-visible:outline-none"
              aria-label="Spending limit in Bahraini dinars"
            />
          </span>
        </label>
        {limit !== null && (
          <>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]" aria-hidden>
              <div className={`h-full rounded-full ${over ? 'bg-bh' : 'bg-lagoon'}`} style={{ width: `${fill}%` }} />
            </div>
            {over ? (
              <div className="mt-2 rounded-lg bg-bh-soft p-2 text-sm text-bh">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle size={14} /> About BD {Math.round(mid - limit)} over your BD {limit} limit
                </p>
                {plan.pricing && !plan.pricing.fits ? (
                  <p className="mt-0.5">Even the cheapest plan Rihla found is over. Try fewer days, a relaxed pace or fewer meal stops.</p>
                ) : (
                  <button className="btn-ghost no-print mt-2 border-bh/30" onClick={onRefit}>
                    <Repeat2 size={15} /> Re-plan with cheaper options
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-lagoon">
                Within your BD {limit} limit (mid-estimate BD {Math.round(mid)}).
                {plan.pricing && plan.pricing.tries > 1 ? ` Rihla re-planned ${plan.pricing.tries - 1} time${plan.pricing.tries > 2 ? 's' : ''}, favouring cheaper places, to get here.` : ''}
              </p>
            )}
          </>
        )}
      </div>

      <button className="mt-3 flex items-center gap-1.5 text-sm font-semibold" onClick={() => setHow(!how)} aria-expanded={how}>
        <Info size={15} /> How this is estimated
        <ChevronDown size={15} className={`transition-transform ${how ? 'rotate-180' : ''}`} />
      </button>
      {how && (
        <ul className="muted mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            Entry fees are each place's published adult and child prices, multiplied by your group ({groupLabel(g)}). Where sources disagree, the range covers
            both.
          </li>
          <li>
            Meals use a typical spend per adult for that place and meal, from menus or recent reviews. Children are counted at {Math.round(CHILD_FOOD_SHARE * 100)}% of an
            adult.
          </li>
          <li>Activities, like karting, use the cheapest common ticket.</li>
          <li>Not included: transport, shopping, drinks at sights, tips, and paid extras you choose on the day.</li>
          <li>These are estimates, not quotes. Each place shows when its prices were checked and where.</li>
        </ul>
      )}
    </section>
  )
}
