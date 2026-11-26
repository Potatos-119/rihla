import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { THEMES, type Theme } from '../lib/themes'
import { Arabic } from './bits'

/** Four dots that preview a theme: page, brand, accent, warm. */
function Swatch({ t }: { t: Theme }) {
  const c = t.colors
  return (
    <span className="relative inline-grid h-9 w-9 shrink-0 grid-cols-2 overflow-hidden rounded-lg ring-1 ring-black/10" aria-hidden>
      <span style={{ background: c.brand }} />
      <span style={{ background: c.bg }} />
      <span style={{ background: c.accent }} />
      <span style={{ background: c.days[2] }} />
    </span>
  )
}

export default function ThemePicker({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    box.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const move = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + THEMES.length) % THEMES.length
    box.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div className="relative" ref={box}>
      <button
        ref={button}
        className="icon-btn !w-auto gap-1.5 px-2 text-pearl/85 hover:bg-white/10 hover:text-pearl"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Colour theme: ${theme.name}`}
      >
        <Palette size={18} />
        <span className="hidden text-sm sm:inline">{theme.name}</span>
      </button>

      {open && (
        <div
          role="radiogroup"
          aria-label="Colour theme"
          style={{ zIndex: 1000 }}
          className="surface hairline absolute top-full right-0 mt-2 max-h-[min(34rem,calc(100dvh-5rem))] w-[19rem] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border p-1.5 text-[var(--text)] shadow-[0_12px_32px_rgb(0_0_0/0.25)]"
        >
          <p className="muted px-2.5 pt-1.5 pb-1 text-xs">Pick the colours you like. Your choice is saved on this device.</p>
          {THEMES.map((t, i) => {
            const on = t.id === theme.id
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onKeyDown={(e) => move(e, i)}
                onClick={() => {
                  onChange(t)
                  setOpen(false)
                  button.current?.focus()
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[var(--surface-2)] ${on ? 'bg-[var(--surface-2)]' : ''}`}
              >
                <Swatch t={t} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <Arabic className="muted text-sm">{t.arabic}</Arabic>
                  </span>
                  <span className="muted block text-xs leading-snug">{t.mood}</span>
                </span>
                {on && <Check size={16} className="shrink-0 text-lagoon" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
