import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CalendarPlus, Check, ChevronDown, Link2, Printer, Repeat2, Save, Trash2, X } from 'lucide-react'
import { PLACES, PLACE_BY_ID } from '../data/places'
import { BASE, WEEKDAYS, alternatives, fmt, interestLabel, zone, type Day, type Plan, type Prefs } from '../lib/planner'
import { Arabic, Cost } from './bits'
import PlacePhoto from './Photo'
import { PHOTOS } from '../data/photos'
import { dayColor } from './MapView'

interface Props {
  plan: Plan
  prefs: Prefs
  dark: boolean
  focusId: string | null
  onFocus: (id: string) => void
  onMove: (day: number, index: number, dir: -1 | 1) => void
  onRemove: (day: number, index: number) => void
  onSwap: (day: number, index: number, placeId: string) => void
  onSave: () => void
  onShare: () => Promise<void>
  onCalendar: () => void
  onReplan: () => void
}

export default function TripView(props: Props) {
  const { plan, prefs, dark } = props
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const total = plan.days.reduce((n, d) => n + d.stops.length, 0)
  const free = plan.days.flatMap((d) => d.stops).filter((s) => PLACE_BY_ID[s.placeId].cost === 0).length
  const driving = plan.days.flatMap((d) => d.stops).reduce((n, s) => n + s.travel, 0)

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight">
          {plan.days.length === 1 ? 'Your day' : `Your ${plan.days.length} days`} in Bahrain
        </h2>
        <p className="muted mt-1">
          {total} stops, {free} of them free, about {Math.round(driving / 6) / 10} hours on the road in total.
        </p>
        <div className="no-print mt-3 flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            onClick={() => {
              props.onSave()
              setSaved(true)
              setTimeout(() => setSaved(false), 1800)
            }}
          >
            {saved ? <Check size={15} /> : <Save size={15} />} {saved ? 'Saved on this device' : 'Save'}
          </button>
          <button
            className="btn-ghost"
            onClick={async () => {
              await props.onShare()
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            }}
          >
            {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? 'Link copied' : 'Copy share link'}
          </button>
          <button className="btn-ghost" onClick={props.onCalendar}>
            <CalendarPlus size={15} /> Add to calendar
          </button>
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </header>

      <WhyPanel plan={plan} prefs={prefs} />

      {plan.days.map((day) => (
        <section key={day.index} aria-labelledby={`day-${day.index}`}>
          <DayCover day={day} color={dayColor(day.index, dark)} />

          {day.stops.length === 0 ? (
            <p className="surface hairline rounded-xl border border-dashed p-4 text-sm">
              Nothing fits this day with the current settings. Try a longer day, another start day, or more interests, then plan again.
            </p>
          ) : (
            <ol className="relative space-y-2 pl-5">
              <span className="absolute top-3 bottom-3 left-[5px] w-px" style={{ background: 'var(--line)' }} aria-hidden />
              {day.stops.map((s, i) => (
                <StopCard key={s.placeId} {...props} dayIndex={day.index} index={i} last={i === day.stops.length - 1} />
              ))}
            </ol>
          )}
        </section>
      ))}

      <button className="btn-ghost no-print" onClick={props.onReplan}>
        <Repeat2 size={15} /> Change settings and plan again
      </button>
    </div>
  )
}

function StopCard({ plan, prefs, dayIndex, index, last, focusId, onFocus, onMove, onRemove, onSwap }: Props & { dayIndex: number; index: number; last: boolean }) {
  const stop = plan.days[dayIndex].stops[index]
  const p = PLACE_BY_ID[stop.placeId]
  const [open, setOpen] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const active = focusId === p.id
  const alts = swapping ? alternatives(plan, dayIndex, index, prefs) : []

  return (
    <li className="relative">
      <span
        className={`absolute top-4 -left-5 h-[11px] w-[11px] rounded-full border-2 ${active ? 'border-bh bg-bh' : 'border-[var(--line)] bg-[var(--bg)]'}`}
        aria-hidden
      />
      <div className={`surface rounded-2xl border p-3 transition-colors ${active ? 'border-bh/60' : 'hairline'}`}>
        <div className="flex gap-3">
          <button className="shrink-0 self-start text-left" onClick={() => onFocus(p.id)} aria-label={`Show ${p.name} on the map`}>
            <PlacePhoto place={p} className="h-14 w-14 rounded-xl" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tabular-nums">
              {fmt(stop.arrive)} – {fmt(stop.leave)}
              {stop.meal && <span className="ml-2 rounded-md bg-bh-soft px-1.5 py-0.5 text-xs font-medium text-bh">{stop.meal}</span>}
            </p>
            <button className="block text-left" onClick={() => onFocus(p.id)}>
              <span className="font-display block text-[1.05rem] leading-snug font-semibold">{p.name}</span>
              <Arabic className="muted block text-left text-[0.8rem] leading-relaxed">{p.arabic}</Arabic>
            </button>
            <p className="muted mt-0.5 text-sm">
              {p.area}, <Cost cost={p.cost} />
            </p>
          </div>
          <div className="no-print flex flex-col items-center">
            <button className="icon-btn" onClick={() => onMove(dayIndex, index, -1)} disabled={index === 0} aria-label="Move earlier">
              <ArrowUp size={16} />
            </button>
            <button className="icon-btn" onClick={() => onMove(dayIndex, index, 1)} disabled={last} aria-label="Move later">
              <ArrowDown size={16} />
            </button>
          </div>
        </div>

        {stop.warnings.map((w) => (
          <p key={w} className="mt-2 flex items-center gap-1.5 rounded-lg bg-bh-soft px-2 py-1 text-sm text-bh">
            <AlertTriangle size={14} /> {w}
          </p>
        ))}

        <div className="no-print mt-2 flex items-center gap-1 border-t pt-2 hairline">
          <button className="btn-ghost border-0 px-2" onClick={() => setOpen(!open)} aria-expanded={open}>
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} /> Why this stop
          </button>
          <button className="btn-ghost border-0 px-2" onClick={() => setSwapping(!swapping)} aria-expanded={swapping}>
            <Repeat2 size={15} /> Swap
          </button>
          <button className="btn-ghost ml-auto border-0 px-2 text-bh" onClick={() => onRemove(dayIndex, index)}>
            <Trash2 size={15} /> Remove
          </button>
        </div>

        {open && (
          <div className="mt-2 space-y-2 text-sm">
            <ul className="space-y-1">
              {stop.reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-lagoon" /> {r}
                </li>
              ))}
            </ul>
            <p className="rounded-lg bg-[var(--surface-2)] p-2">{p.tip}</p>
          </div>
        )}

        {swapping && (
          <div className="mt-2 text-sm">
            {alts.length ? (
              <>
                <p className="muted mb-1">Other places that fit this time slot:</p>
                <ul className="space-y-1">
                  {alts.map((a) => (
                    <li key={a.id}>
                      <button
                        className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-[var(--surface-2)]"
                        onClick={() => {
                          onSwap(dayIndex, index, a.id)
                          setSwapping(false)
                        }}
                      >
                        <PlacePhoto place={a} className="h-9 w-9 shrink-0 rounded-lg" />
                        <span className="flex-1">
                          {a.name} <span className="muted">{a.tags.slice(0, 2).map(interestLabel).join(', ')}</span>
                        </span>
                        <span className="muted">Use</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted flex items-center gap-1.5">
                <X size={14} /> No other place fits this slot with your settings.
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

const ZONE_NAME: Record<string, string> = { Manama: 'Manama', Muharraq: 'Muharraq', West: 'the northwest coast', South: 'the south' }

function DayCover({ day, color }: { day: Day; color: string }) {
  const zones = [...new Set(day.stops.map((s) => ZONE_NAME[zone(PLACE_BY_ID[s.placeId])]))]
  const where = zones.length ? zones.slice(0, -1).join(', ') + (zones.length > 1 ? ' and ' : '') + zones[zones.length - 1] : ''
  const star = day.stops
    .map((s) => PLACE_BY_ID[s.placeId])
    .filter((p) => PHOTOS[p.id] && PHOTOS[p.id].width >= PHOTOS[p.id].height)
    .sort((a, b) => b.rating - a.rating)[0]
  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl">
      {star ? (
        <PlacePhoto place={star} variant="cover" className="aspect-[5/2] w-full" />
      ) : (
        <div className="aspect-[5/2] w-full" style={{ background: color }} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gulf-950/85 via-gulf-950/25 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 p-3.5 pb-5 text-pearl">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/70" style={{ background: color }} aria-hidden />
          <h3 id={`day-${day.index}`} className="font-display text-xl leading-none font-semibold">
            Day {day.index + 1}
          </h3>
        </div>
        <p className="mt-1 text-sm text-pearl/85">
          {WEEKDAYS[day.weekday]}
          {where ? ` around ${where}` : ''}, from {BASE.name}
        </p>
      </div>
    </div>
  )
}

function WhyPanel({ plan, prefs }: { plan: Plan; prefs: Prefs }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-2xl bg-gulf-900 p-4 text-pearl dark:bg-[var(--surface-2)]">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <span className="font-display text-lg font-semibold">How Rihla made this plan</span>
          <span className="block text-sm text-pearl/70">The inputs it used, the rules it followed, and what it can’t know.</span>
        </span>
        <ChevronDown className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 grid gap-4 text-sm">
          <div>
            <p className="font-semibold">Inputs</p>
            <p className="text-pearl/80">
              {prefs.days} day{prefs.days > 1 ? 's' : ''} from {WEEKDAYS[prefs.weekday]}, {fmt(Number(prefs.start.slice(0, 2)) * 60 + Number(prefs.start.slice(3)))} to{' '}
              {fmt(Number(prefs.end.slice(0, 2)) * 60 + Number(prefs.end.slice(3)))}; interests {prefs.interests.map(interestLabel).join(', ')}; {prefs.pace} pace;{' '}
              {prefs.budget === 'any' ? 'any budget' : prefs.budget === 'low' ? 'low budget' : 'free entry only'}
              {prefs.kids ? '; travelling with kids' : ''}. Plus {PLACES.length} hand-picked places with hours, prices and map positions.
            </p>
          </div>
          <div>
            <p className="font-semibold">Rules</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-pearl/80">
              <li>Score every place: +3 per interest it matches, plus its visitor rating.</li>
              <li>Remove places that are closed that day, over budget, or would close before you leave.</li>
              <li>Subtract points for drive time and for crossing to another part of the island, so each day stays in one area.</li>
              <li>Reserve breakfast, lunch and dinner slots for food places.</li>
              <li>Give outdoor sunset spots a bonus between 4 and 6 pm.</li>
              <li>Pick the highest score, move the clock on, and repeat until the day is full.</li>
            </ol>
          </div>
          {plan.skipped.length > 0 && (
            <div>
              <p className="font-semibold">Considered, but left out</p>
              <ul className="text-pearl/80">
                {plan.skipped.map((s) => (
                  <li key={s.placeId}>
                    {PLACE_BY_ID[s.placeId].name}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="font-semibold">What it can’t know</p>
            <ul className="list-disc space-y-0.5 pl-5 text-pearl/80">
              <li>Live traffic, weather, or prayer-time pauses. Drive times are estimates from straight-line distance.</li>
              <li>Today’s exact opening hours, holidays and events. Check before you go.</li>
              <li>Your mood. If a stop looks wrong to you, swap or remove it; the plan re-times itself.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
