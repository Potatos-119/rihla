import { useMemo, useState } from 'react'
import { BookOpen, Clock, MapPin, Plus, Search, X } from 'lucide-react'
import { INTERESTS, PLACES, PLACE_BY_ID, type Interest } from '../data/places'
import { WEEKDAYS, fmt, toMin, type Plan } from '../lib/planner'
import { Arabic, Cost, ICON } from './bits'
import PlacePhoto from './Photo'
import { PHOTOS } from '../data/photos'

interface Props {
  plan: Plan | null
  selected: string | null
  onSelect: (id: string | null) => void
  onAdd: (placeId: string, day: number) => void
}

export default function Explore({ plan, selected, onSelect, onAdd }: Props) {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<Interest | null>(null)
  const inPlan = useMemo(() => new Map(plan?.days.flatMap((d) => d.stops.map((s) => [s.placeId, d.index] as const)) ?? []), [plan])

  const list = PLACES.filter((p) => (!tag || p.tags.includes(tag)) && (q.trim() === '' || `${p.name} ${p.area} ${p.blurb} ${p.arabic}`.toLowerCase().includes(q.toLowerCase())))

  if (selected) {
    const p = PLACE_BY_ID[selected]
    return (
      <article className="space-y-4">
        <button className="btn-ghost" onClick={() => onSelect(null)}>
          <X size={15} /> Back to all places
        </button>
        <PlacePhoto place={p} variant="hero" className="aspect-[16/9] w-full rounded-2xl" />
        <div>
          <div>
            <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight">{p.name}</h2>
            <Arabic className="muted text-lg">{p.arabic}</Arabic>
          </div>
        </div>
        <p className="max-w-[60ch] text-[1.02rem]">{p.blurb}</p>
        <dl className="surface hairline grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-2xl border p-4 text-sm">
          <dt className="muted flex items-center gap-1.5"><MapPin size={14} /> Area</dt>
          <dd>{p.area}</dd>
          <dt className="muted flex items-center gap-1.5"><Clock size={14} /> Hours</dt>
          <dd>
            {p.open === '00:00' && p.close === '23:59' ? 'Open all day' : `${fmt(toMin(p.open))} to ${fmt(toMin(p.close))}`}
            {p.closedDays?.length ? `, closed ${p.closedDays.map((d) => WEEKDAYS[d]).join(' and ')}` : ''}
          </dd>
          <dt className="muted">Typical visit</dt>
          <dd>{p.minutes} minutes</dd>
          <dt className="muted">Entry</dt>
          <dd><Cost cost={p.cost} /></dd>
        </dl>
        <p className="rounded-xl bg-sand/60 p-3 text-sm dark:bg-sand/10">
          <span className="font-semibold">Local tip. </span>
          {p.tip}
        </p>
        <div className="flex flex-wrap gap-2">
          {plan ? (
            inPlan.has(p.id) ? (
              <p className="text-sm font-semibold text-lagoon">Already in your plan on day {inPlan.get(p.id)! + 1}</p>
            ) : (
              plan.days.map((d) => (
                <button key={d.index} className="btn-primary" onClick={() => onAdd(p.id, d.index)}>
                  <Plus size={16} /> Add to day {d.index + 1}
                </button>
              ))
            )
          ) : (
            <p className="muted text-sm">Plan a trip first, then you can add this place to any day.</p>
          )}
          <a className="btn-ghost" href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">
            <MapPin size={15} /> Directions
          </a>
          {PHOTOS[p.id]?.article && (
            <a className="btn-ghost" href={PHOTOS[p.id].article!} target="_blank" rel="noreferrer">
              <BookOpen size={15} /> Read on Wikipedia
            </a>
          )}
        </div>
        <p className="muted text-xs">Hours and prices are approximate. Check with the venue before you visit.</p>
      </article>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight">Explore {PLACES.length} places</h2>
      <label className="surface hairline flex items-center gap-2 rounded-xl border px-3 py-2">
        <Search size={16} className="muted" />
        <span className="sr-only">Search places</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search forts, souqs, beaches…" className="w-full bg-transparent outline-none" />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button className="chip" aria-pressed={tag === null} onClick={() => setTag(null)}>All</button>
        {INTERESTS.map(({ id, label }) => {
          const Icon = ICON[id]
          return (
            <button key={id} className="chip" aria-pressed={tag === id} onClick={() => setTag(tag === id ? null : id)}>
              <Icon size={13} /> {label}
            </button>
          )
        })}
      </div>
      {list.length === 0 ? (
        <p className="muted py-6 text-center">No places match “{q}”. Try a different word or clear the filter.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {list.map((p) => (
            <li key={p.id}>
              <button className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => onSelect(p.id)}>
                <PlacePhoto place={p} className="h-14 w-14 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="muted block truncate text-sm">{p.area}, {p.blurb}</span>
                </span>
                {inPlan.has(p.id) && <span className="rounded-md bg-lagoon-2 px-1.5 py-0.5 text-xs font-semibold text-lagoon">Day {inPlan.get(p.id)! + 1}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
