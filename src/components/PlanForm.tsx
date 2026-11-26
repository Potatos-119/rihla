import { useState } from 'react'
import { Sparkles, UtensilsCrossed, Wand2 } from 'lucide-react'
import { INTERESTS } from '../data/places'
import { EXAMPLES, parseRequest, type Understood } from '../lib/parse'
import { WEEKDAYS, type Prefs } from '../lib/planner'
import { ICON, Stepper } from './bits'

interface Props {
  prefs: Prefs
  setPrefs: (p: Prefs) => void
  onPlan: (p: Prefs) => void
}

export default function PlanForm({ prefs, setPrefs, onPlan }: Props) {
  const [text, setText] = useState('')
  const [understood, setUnderstood] = useState<Understood[] | null>(null)

  const read = (value = text) => {
    if (!value.trim()) return
    const r = parseRequest(value, prefs)
    setPrefs(r.prefs)
    setUnderstood(r.understood)
  }

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs({ ...prefs, [k]: v })
  const toggle = (i: (typeof INTERESTS)[number]['id']) =>
    set('interests', prefs.interests.includes(i) ? prefs.interests.filter((x) => x !== i) : [...prefs.interests, i])

  return (
    <div className="space-y-7">
      <section>
        <h2 className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight">Where should your days in Bahrain go?</h2>
        <p className="muted mt-1.5 max-w-[46ch]">
          Describe the trip in your own words. Rihla turns it into settings you can check, then plans around opening hours and drive times.
        </p>

        <form
          className="surface hairline mt-4 rounded-2xl border p-2 shadow-[0_1px_0_rgb(8_34_42/0.04)]"
          onSubmit={(e) => {
            e.preventDefault()
            read()
          }}
        >
          <label htmlFor="ask" className="sr-only">Describe your trip</label>
          <textarea
            id="ask"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                read()
              }
            }}
            placeholder="e.g. Two days, I love history and seafood, student budget"
            className="w-full resize-none bg-transparent px-2 py-1.5 outline-none placeholder:text-[var(--muted)]"
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="muted shrink-0 rounded-md px-2 py-1 text-xs hover:bg-[var(--surface-2)]"
                  onClick={() => {
                    setText(ex)
                    read(ex)
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
            <button type="submit" className="btn-ghost shrink-0" disabled={!text.trim()}>
              <Wand2 size={15} /> Read it
            </button>
          </div>
        </form>

        {understood && (
          <div className="mt-3 rounded-xl bg-lagoon-2/60 p-3 text-sm dark:bg-lagoon/15" aria-live="polite">
            <p className="font-semibold">
              {understood.length ? 'Here is what I took from that' : 'I couldn’t pick out any settings from that'}
            </p>
            {understood.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {understood.map((u) => (
                  <li key={u.label} className="surface rounded-lg px-2 py-1">
                    {u.label} <span className="muted">from “{u.evidence}”</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted mt-1">Try naming a number of days, a few interests, or a budget. You can also set them below.</p>
            )}
            <p className="muted mt-2 text-xs">
              This is keyword matching, not mind reading. Anything it missed, fix in the settings below.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <Field label="Interests">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(({ id, label }) => {
              const Icon = ICON[id]
              return (
                <button key={id} type="button" className="chip" aria-pressed={prefs.interests.includes(id)} onClick={() => toggle(id)}>
                  <Icon size={14} strokeWidth={1.75} /> {label}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Days">
            <div className="seg">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" aria-pressed={prefs.days === n} onClick={() => set('days', n)}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="First day">
            <select
              value={prefs.weekday}
              onChange={(e) => set('weekday', Number(e.target.value))}
              className="surface hairline w-full rounded-[10px] border px-2.5 py-[0.42rem] text-sm"
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Adults">
            <Stepper label="Adults" value={prefs.adults} min={1} max={12} onChange={(v) => set('adults', v)} />
          </Field>
          <Field label="Children">
            <Stepper label="Children" value={prefs.children} min={0} max={10} onChange={(v) => setPrefs({ ...prefs, children: v, kids: v > 0 })} />
          </Field>
        </div>

        <Field label="Pace">
          <div className="seg">
            {(['relaxed', 'balanced', 'packed'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={prefs.pace === p} onClick={() => set('pace', p)}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Spending limit for the whole trip (optional)">
          <label className="surface hairline flex items-center gap-2 rounded-[10px] border px-3 py-[0.35rem] text-sm focus-within:border-lagoon focus-within:ring-2 focus-within:ring-lagoon/30">
            <span className="muted">BD</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={5}
              placeholder="No limit"
              value={prefs.limit ?? ''}
              onChange={(e) => set('limit', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
              className="w-full bg-transparent outline-none focus-visible:outline-none"
              aria-label="Spending limit in Bahraini dinars"
            />
          </label>
          <p className="muted mt-1 text-xs">Covers food, entry fees and activities for everyone. Rihla picks cheaper options to stay under it.</p>
        </Field>

        <Field label="Entry fees">
          <div className="seg">
            {([['free', 'Free only'], ['low', 'Up to BD 3'], ['any', 'Any']] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={prefs.budget === v} onClick={() => set('budget', v)}>
                {l}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <input type="time" value={prefs.start} onChange={(e) => set('start', e.target.value)} className="surface hairline w-full rounded-[10px] border px-2.5 py-[0.35rem] text-sm" />
          </Field>
          <Field label="End">
            <input type="time" value={prefs.end} onChange={(e) => set('end', e.target.value)} className="surface hairline w-full rounded-[10px] border px-2.5 py-[0.35rem] text-sm" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip" aria-pressed={prefs.meals} onClick={() => set('meals', !prefs.meals)}>
            <UtensilsCrossed size={14} /> Plan meal stops
          </button>
        </div>
      </section>

      <button type="button" className="btn-primary w-full text-base" onClick={() => onPlan(prefs)} disabled={!prefs.interests.length}>
        <Sparkles size={17} /> Plan my trip
      </button>
      {!prefs.interests.length && <p className="text-sm text-bh">Pick at least one interest so there is something to plan around.</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      {children}
    </div>
  )
}
