import { useEffect, useMemo, useState } from 'react'
import { Car, CheckCircle2, Clock, Footprints, MapPin, Navigation, UtensilsCrossed } from 'lucide-react'
import { PLACE_BY_ID } from '../data/places'
import { formatRange, peopleLabel, stopCost, total } from '../lib/cost'
import { legStart, mapsDirections, mapsPlace } from '../lib/links'
import { BASE, fmt, toMin, type Plan, type Prefs } from '../lib/planner'
import { tripDates } from '../lib/share'
import PlacePhoto from './Photo'

const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const BAHRAIN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bahrain', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Today's date (YYYY-MM-DD) and the minutes since midnight, in Bahrain. */
function bahrainNow(): { date: string; min: number } {
  const parts = Object.fromEntries(BAHRAIN.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) }
}

const until = (m: number) => (m <= 0 ? 'now' : m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim())

export default function TodayView({ plan, prefs }: { plan: Plan; prefs: Prefs }) {
  const dates = tripDates(plan)
  const [clock, setClock] = useState(bahrainNow)
  useEffect(() => {
    const t = setInterval(() => setClock(bahrainNow()), 30_000)
    return () => clearInterval(t)
  }, [])

  const liveIndex = dates.indexOf(clock.date)
  const live = liveIndex >= 0
  const [pick, setPick] = useState(0)
  const dayIndex = live ? liveIndex : pick
  const day = plan.days[dayIndex]
  const first = day.stops[0]
  const last = day.stops.at(-1)
  const [preview, setPreview] = useState<number>(() => (first ? first.arrive - first.travel - 10 : toMin(prefs.start)))
  const now = live ? clock.min : preview
  const group = { adults: prefs.adults, children: prefs.children }

  const status = useMemo(() => {
    const current = day.stops.findIndex((s) => s.arrive <= now && now < s.leave)
    const next = day.stops.findIndex((s) => s.arrive > now)
    return { current, next }
  }, [day, now])

  if (!first) return <p className="muted">There are no stops planned for this day.</p>

  const next = status.next >= 0 ? day.stops[status.next] : null
  const nextPlace = next ? PLACE_BY_ID[next.placeId] : null
  const leaveAt = next ? next.arrive - next.travel : 0
  const from = next ? legStart(day, status.next) : BASE
  const cur = status.current >= 0 ? PLACE_BY_ID[day.stops[status.current].placeId] : null

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight">{live ? 'Today' : 'Day preview'}</h2>
        <p className="muted mt-1">
          {live
            ? `Day ${dayIndex + 1} of your trip, ${LONG.format(new Date(`${dates[dayIndex]}T12:00:00`))}. Bahrain time ${fmt(clock.min)}.`
            : `Your trip starts ${LONG.format(new Date(`${dates[0]}T12:00:00`))}. On the day, this page follows the clock; until then, drag the time to preview it.`}
        </p>
        {!live && (
          <div className="no-print mt-3 space-y-3">
            {plan.days.length > 1 && (
              <div className="seg" role="group" aria-label="Day to preview">
                {plan.days.map((d) => (
                  <button
                    key={d.index}
                    aria-pressed={d.index === pick}
                    onClick={() => {
                      setPick(d.index)
                      const f = d.stops[0]
                      setPreview(f ? f.arrive - f.travel - 10 : toMin(prefs.start))
                    }}
                  >
                    Day {d.index + 1}
                  </button>
                ))}
              </div>
            )}
            <label className="block text-sm">
              <span className="flex justify-between">
                <span className="font-semibold">Preview at</span>
                <span className="tabular-nums">{fmt(preview)}</span>
              </span>
              <input
                type="range"
                min={toMin(prefs.start) - 30}
                max={(last?.leave ?? toMin(prefs.end)) + 15}
                step={5}
                value={preview}
                onChange={(e) => setPreview(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--color-lagoon)]"
              />
            </label>
          </div>
        )}
      </header>

      <section className="rounded-2xl bg-gulf-900 p-4 text-pearl" aria-live="polite">
        {cur && (
          <p className="text-sm text-pearl/80">
            Now at <span className="font-semibold text-pearl">{cur.name}</span> until {fmt(day.stops[status.current].leave)}
          </p>
        )}
        {next && nextPlace ? (
          <>
            <p className="mt-1 text-sm text-pearl/80">Next{next.meal ? `, ${next.meal}` : ''}</p>
            <p className="font-display text-2xl leading-tight font-semibold">{nextPlace.name}</p>
            <p className="mt-1 tabular-nums">
              Arrive {fmt(next.arrive)}.{' '}
              {now >= leaveAt ? (
                <span className="font-semibold">Leave now{now > leaveAt + 5 ? `: about ${now - leaveAt} min behind` : ''}.</span>
              ) : (
                <span>
                  Leave at <span className="font-semibold">{fmt(leaveAt)}</span> ({until(leaveAt - now)}).
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-pearl/80">
              {next.travel <= 5 ? `${next.travel} min walk` : `${next.travel} min drive incl. parking`} from {status.next === 0 ? BASE.name : from.name}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="inline-flex items-center gap-1.5 rounded-xl bg-pearl px-3 py-2 text-sm font-semibold text-gulf-950" href={mapsDirections(from, nextPlace)} target="_blank" rel="noreferrer">
                <Navigation size={15} /> Directions in Google Maps
              </a>
              <a className="inline-flex items-center gap-1.5 rounded-xl border border-pearl/40 px-3 py-2 text-sm" href={mapsPlace(nextPlace)} target="_blank" rel="noreferrer">
                <MapPin size={15} /> Show on map
              </a>
            </div>
          </>
        ) : cur ? (
          <p className="mt-1">This is the last stop of the day. Enjoy it.</p>
        ) : now < first.arrive ? null : (
          <p className="font-display text-xl font-semibold">That's the day done. Rest well.</p>
        )}
      </section>

      <ol className="relative space-y-1 pl-6">
        <span className="absolute top-2 bottom-2 left-[9px] w-px bg-[var(--line)]" aria-hidden />
        {day.stops.map((s, i) => {
          const p = PLACE_BY_ID[s.placeId]
          const done = now >= s.leave
          const here = i === status.current
          const showNow = (i === 0 && now < s.arrive) || (i > 0 && now >= day.stops[i - 1].leave && now < s.arrive)
          const cost = total(stopCost(s, group))
          return (
            <li key={s.placeId}>
              {showNow && <NowMarker min={now} />}
              <div className={`relative flex items-center gap-3 rounded-xl p-2 ${here ? 'bg-lagoon-2' : ''} ${done ? 'opacity-55' : ''}`}>
                <span className="absolute top-1/2 -left-[21px] -translate-y-1/2" aria-hidden>
                  {done ? (
                    <CheckCircle2 size={16} className="bg-[var(--bg)] text-lagoon" />
                  ) : (
                    <span className={`block h-3 w-3 rounded-full border-2 ${here ? 'border-bh bg-bh' : 'border-[var(--line)] bg-[var(--bg)]'}`} />
                  )}
                </span>
                <PlacePhoto place={p} className="h-11 w-11 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs tabular-nums muted">
                    {fmt(s.arrive)} – {fmt(s.leave)}
                    {s.travel > 5 ? (
                      <>
                        {' '}
                        <Car size={11} className="inline -translate-y-px" /> {s.travel} min
                      </>
                    ) : (
                      <>
                        {' '}
                        <Footprints size={11} className="inline -translate-y-px" /> walk
                      </>
                    )}
                  </span>
                  <span className="block truncate font-semibold">
                    {s.meal && <UtensilsCrossed size={13} className="mr-1 inline -translate-y-px text-bh" />}
                    {s.meal ? `${s.meal[0].toUpperCase() + s.meal.slice(1)} at ${p.name}` : p.name}
                  </span>
                  {cost[1] > 0 && (
                    <span className="block text-xs muted">
                      ≈ {formatRange(cost)} {peopleLabel(group)}
                    </span>
                  )}
                </span>
                {here && <span className="rounded-full bg-bh px-2 py-0.5 text-xs font-semibold text-[var(--surface)]">Now</span>}
              </div>
            </li>
          )
        })}
        {last && now >= last.leave && (
          <li>
            <NowMarker min={now} />
          </li>
        )}
      </ol>
    </div>
  )
}

function NowMarker({ min }: { min: number }) {
  return (
    <div className="relative my-1 flex items-center gap-2" aria-label={`Now, ${fmt(min)}`}>
      <span className="absolute -left-[22px] h-[9px] w-[9px] rounded-full bg-bh ring-4 ring-bh/20" aria-hidden />
      <span className="h-0.5 flex-1 bg-bh" aria-hidden />
      <span className="flex items-center gap-1 text-xs font-semibold text-bh">
        <Clock size={12} /> {fmt(min)}
      </span>
    </div>
  )
}
