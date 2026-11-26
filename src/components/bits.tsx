import { Building2, Landmark, Palette, ShoppingBag, Trees, Users, UtensilsCrossed, Waves, type LucideIcon } from 'lucide-react'
import type { Interest, Place } from '../data/places'

export const ICON: Record<Interest, LucideIcon> = {
  heritage: Landmark,
  food: UtensilsCrossed,
  nature: Trees,
  sea: Waves,
  modern: Building2,
  family: Users,
  shopping: ShoppingBag,
  crafts: Palette,
}

const TONE: Record<Interest, string> = {
  heritage: 'bg-sand text-gulf-900',
  food: 'bg-bh-soft text-bh',
  nature: 'bg-lagoon-2 text-lagoon',
  sea: 'bg-lagoon-2 text-gulf-800',
  modern: 'bg-pearl-2 text-gulf-800',
  family: 'bg-sand text-gulf-800',
  shopping: 'bg-sand text-gulf-900',
  crafts: 'bg-bh-soft text-gulf-900',
}

export function PlaceBadge({ place, size = 40 }: { place: Place; size?: number }) {
  const Icon = ICON[place.tags[0]]
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-xl ${TONE[place.tags[0]]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={size * 0.48} strokeWidth={1.75} />
    </span>
  )
}

export function Arabic({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span lang="ar" dir="rtl" className={`font-arabic ${className}`}>
      {children}
    </span>
  )
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div className="seg !grid-cols-[2rem_1fr_2rem] !grid-flow-row items-center" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`} className="disabled:opacity-30">
        −
      </button>
      <output className="text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`} className="disabled:opacity-30">
        +
      </button>
    </div>
  )
}
