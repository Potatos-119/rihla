import { useEffect, useRef, useState } from 'react'
import { Compass, ListOrdered, Map as MapIcon, SlidersHorizontal } from 'lucide-react'
import PlanForm from './components/PlanForm'
import TripView from './components/TripView'
import Explore from './components/Explore'
import MapView from './components/MapView'
import { Arabic } from './components/bits'
import ThemePicker from './components/ThemePicker'
import { applyTheme, initialTheme, type Theme } from './lib/themes'
import { DEFAULT_PREFS, buildPlan, makeStop, retime, type Plan, type Prefs } from './lib/planner'
import { download, loadFromHash, loadLocal, saveLocal, shareUrl, toIcs } from './lib/share'

type Tab = 'plan' | 'trip' | 'explore' | 'map'

/** Rebuild a saved trip (ids only) into a timed plan. */
function restore(prefs: Prefs, days: string[][]): Plan {
  const fresh = buildPlan(prefs)
  return {
    skipped: fresh.skipped,
    days: days.map((ids, i) =>
      retime({ index: i, weekday: (prefs.weekday + i) % 7, stops: ids.map((id) => fresh.days[i]?.stops.find((s) => s.placeId === id) ?? makeStop(id, prefs)) }, prefs),
    ),
  }
}

function initial(): { prefs: Prefs; plan: Plan | null; from: 'link' | 'saved' | null } {
  const s = loadFromHash() ?? null
  if (s) return { prefs: { ...DEFAULT_PREFS, ...s.prefs }, plan: restore({ ...DEFAULT_PREFS, ...s.prefs }, s.days), from: 'link' }
  const l = loadLocal()
  if (l) return { prefs: { ...DEFAULT_PREFS, ...l.prefs }, plan: restore({ ...DEFAULT_PREFS, ...l.prefs }, l.days), from: 'saved' }
  return { prefs: DEFAULT_PREFS, plan: null, from: null }
}

export default function App() {
  const [start] = useState(initial)
  const [prefs, setPrefs] = useState<Prefs>(start.prefs)
  const [plan, setPlan] = useState<Plan | null>(start.plan)
  const [tab, setTab] = useState<Tab>(start.plan ? 'trip' : 'plan')
  const [focus, setFocus] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(
    start.from === 'link' ? 'Opened a shared trip. Edit it freely; your changes stay on this device.' : start.from === 'saved' ? 'Welcome back. This is the trip you saved.' : null,
  )
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [tab, selected])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(t)
  }, [notice])

  const makePlan = (p: Prefs) => {
    setPrefs(p)
    setPlan(buildPlan(p))
    setFocus(null)
    setTab('trip')
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }

  const editDay = (dayIndex: number, change: (stops: Plan['days'][number]['stops']) => Plan['days'][number]['stops']) => {
    if (!plan) return
    setPlan({
      ...plan,
      days: plan.days.map((d) => (d.index === dayIndex ? retime({ ...d, stops: change([...d.stops]) }, prefs) : d)),
    })
  }

  const selectPlace = (id: string) => {
    setFocus(id)
    const planned = plan?.days.some((d) => d.stops.some((s) => s.placeId === id))
    if (!planned || tab === 'explore' || tab === 'map') {
      setSelected(id)
      if (tab !== 'map' || window.innerWidth >= 1024) setTab('explore')
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Compass; mobileOnly?: boolean; disabled?: boolean }[] = [
    { id: 'plan', label: 'Plan', icon: SlidersHorizontal },
    { id: 'trip', label: 'Trip', icon: ListOrdered, disabled: !plan },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'map', label: 'Map', icon: MapIcon, mobileOnly: true },
  ]

  return (
    <div className="flex h-full flex-col lg:grid lg:grid-cols-[minmax(400px,480px)_18px_1fr]">
      <div className={`flex min-h-0 flex-col lg:h-full lg:flex-1 ${tab === 'map' ? 'flex-none' : 'flex-1'}`}>
        <header className="no-print shrink-0 bg-gulf-900 text-pearl">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-display text-[1.7rem] leading-none font-bold tracking-tight">Rihla</h1>
              <Arabic className="text-[1.35rem] leading-none text-[var(--on-brand-accent)]">رحلة</Arabic>
              <span className="hidden text-sm text-pearl/60 sm:inline">Bahrain trip planner</span>
            </div>
            <ThemePicker theme={theme} onChange={setTheme} />
          </div>
          <nav className="flex gap-1 px-3" aria-label="Sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                disabled={t.disabled}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 rounded-t-lg px-3 pt-2 pb-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  t.mobileOnly ? 'lg:hidden' : ''
                } ${tab === t.id ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-pearl/75 hover:text-pearl'}`}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </nav>
        </header>
        <div className="serrated-h no-print shrink-0 lg:hidden" aria-hidden />

        {notice && (
          <p role="status" className="no-print mx-5 mt-3 rounded-xl bg-lagoon-2 px-3 py-2 text-sm text-[var(--text)]">
            {notice}
          </p>
        )}

        <main ref={mainRef} className={`scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 ${tab === 'map' ? 'hidden lg:block' : ''}`}>
          {tab === 'plan' && <PlanForm prefs={prefs} setPrefs={setPrefs} onPlan={makePlan} />}
          {tab === 'trip' && plan && (
            <TripView
              plan={plan}
              prefs={prefs}
              theme={theme}
              focusId={focus}
              onFocus={(id) => setFocus(id)}
              onMove={(d, i, dir) =>
                editDay(d, (s) => {
                  ;[s[i], s[i + dir]] = [s[i + dir], s[i]]
                  return s
                })
              }
              onRemove={(d, i) => editDay(d, (s) => s.filter((_, j) => j !== i))}
              onSwap={(d, i, id) =>
                editDay(d, (s) => {
                  s[i] = { ...makeStop(id, prefs, s[i].meal), reasons: [...(s[i].meal ? [`Fills your ${s[i].meal} slot`] : []), 'Swapped in by you'] }
                  return s
                })
              }
              onSave={() => saveLocal(prefs, plan)}
              onShare={async () => {
                const url = shareUrl(prefs, plan)
                try {
                  await navigator.clipboard.writeText(url)
                } catch {
                  window.prompt('Copy this link', url)
                }
              }}
              onCalendar={() => download('rihla-bahrain-trip.ics', toIcs(plan, { adults: prefs.adults, children: prefs.children }), 'text/calendar')}
              onReplan={() => setTab('plan')}
              onGroup={(g) => setPrefs({ ...prefs, ...g, kids: prefs.kids || g.children > 0 })}
              onLimit={(limit) => setPrefs({ ...prefs, limit })}
              onRefit={() => {
                setPlan(buildPlan(prefs))
                setNotice('Re-planned with cheaper options. Your manual edits were replaced.')
              }}
            />
          )}
          {tab === 'explore' && (
            <Explore
              plan={plan}
              selected={selected}
              onSelect={(id) => {
                setSelected(id)
                setFocus(id)
              }}
              onAdd={(id, d) => {
                editDay(d, (s) => [...s, makeStop(id, prefs)])
                setNotice(`Added to day ${d + 1}. Open Trip to reorder it.`)
              }}
            />
          )}
        </main>
      </div>

      <div className="serrated-v no-print hidden lg:block" aria-hidden />

      <section
        aria-label="Map"
        className={`no-print min-h-0 lg:block lg:h-full ${tab === 'map' ? 'block flex-1' : 'hidden'}`}
      >
        <MapView plan={plan} focusId={focus} theme={theme} onSelect={selectPlace} />
      </section>
    </div>
  )
}
