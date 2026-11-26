import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, ChevronDown, Download, X } from 'lucide-react'
import { PLACE_BY_ID } from '../data/places'
import { download, toIcs, tripDates } from '../lib/share'
import { googleLink, outlookLink } from '../lib/links'
import { fmt, WEEKDAYS, type Plan, type Prefs } from '../lib/planner'

const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Add the trip to whatever calendar the traveller uses: one .ics file for the whole trip
 * (Apple Calendar, Outlook desktop, and an import into Google Calendar), or one-tap links per stop
 * for Google Calendar and Outlook on the web.
 */
export default function CalendarMenu({ plan, prefs }: { plan: Plan; prefs: Prefs }) {
  const [open, setOpen] = useState(false)
  const [how, setHow] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const group = { adults: prefs.adults, children: prefs.children }
  const dates = tripDates(plan)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const file = () => download(`rihla-bahrain-${dates[0]}.ics`, toIcs(plan, group), 'text/calendar')

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <CalendarPlus size={15} /> Add to calendar
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="surface m-auto max-h-[88dvh] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl p-0 text-[var(--text)] shadow-[0_20px_60px_rgb(0_0_0/0.35)] backdrop:bg-black/50"
        aria-labelledby="cal-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-[var(--surface)] px-4 py-3 hairline">
          <h2 id="cal-title" className="font-display text-lg font-semibold">
            Add your trip to a calendar
          </h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-4 text-sm">
          {!prefs.date && (
            <p className="rounded-lg bg-sand/60 p-2 dark:bg-sand/10">
              No start date is set, so events go on the next {WEEKDAYS[plan.days[0].weekday]}, {LONG.format(new Date(`${dates[0]}T12:00:00`))}. Pick a date in
              Plan to change it.
            </p>
          )}

          <section>
            <h3 className="font-semibold">The whole trip in one file</h3>
            <p className="muted mt-0.5">Works with Apple Calendar, Outlook on a computer, and most phone calendars. Each stop gets a reminder 30 minutes before.</p>
            <button className="btn-primary mt-2" onClick={file}>
              <Download size={16} /> Download calendar file (.ics)
            </button>
            <button className="mt-2 flex items-center gap-1 font-semibold" onClick={() => setHow(!how)} aria-expanded={how}>
              Importing into Google Calendar <ChevronDown size={15} className={`transition-transform ${how ? 'rotate-180' : ''}`} />
            </button>
            {how && (
              <ol className="muted mt-1 list-decimal space-y-0.5 pl-5">
                <li>Download the calendar file above.</li>
                <li>On a computer, open calendar.google.com. The phone app cannot import files.</li>
                <li>Click the gear icon, then Settings, then Import and export.</li>
                <li>Choose the file, pick which calendar to add it to, and click Import.</li>
              </ol>
            )}
          </section>

          <section>
            <h3 className="font-semibold">One stop at a time</h3>
            <p className="muted mt-0.5">
              Opens your calendar with the event filled in. Your calendar's usual reminder applies. Google adds one event per tap.
            </p>
            {plan.days.map((day, i) => (
              <div key={day.index} className="mt-3">
                <p className="font-semibold">
                  Day {day.index + 1}, {LONG.format(new Date(`${dates[i]}T12:00:00`))}
                </p>
                <ul className="mt-1 divide-y divide-[var(--line)] rounded-xl border hairline">
                  {day.stops.map((s) => {
                    const p = PLACE_BY_ID[s.placeId]
                    return (
                      <li key={s.placeId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <span className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                          <span className="tabular-nums muted">{fmt(s.arrive)}</span> {s.meal ? `${s.meal[0].toUpperCase() + s.meal.slice(1)} at ` : ''}
                          {p.name}
                        </span>
                        <span className="flex gap-1.5 text-xs">
                          <a className="btn-ghost !px-2 !py-1" href={googleLink(s, dates[i], group)} target="_blank" rel="noreferrer">
                            Google
                          </a>
                          <a className="btn-ghost !px-2 !py-1" href={outlookLink(s, dates[i], group, 'live')} target="_blank" rel="noreferrer">
                            Outlook
                          </a>
                          <a className="btn-ghost !px-2 !py-1" href={outlookLink(s, dates[i], group, 'office')} target="_blank" rel="noreferrer" title="Outlook for work or school (Office 365)">
                            Office 365
                          </a>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </dialog>
    </>
  )
}
