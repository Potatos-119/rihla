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

const COST_LABEL = ['Free', 'Under BD 3', 'BD 3 to 10', 'Over BD 10']

export function Cost({ cost }: { cost: Place['cost'] }) {
  if (cost === 0) return <span>Free</span>
  return (
    <span title={COST_LABEL[cost]}>
      <span className="sr-only">{COST_LABEL[cost]}</span>
      <span aria-hidden>
        BD{' '}
        <span className="tracking-tight">
          {'•••'.slice(0, cost)}
          <span className="opacity-30">{'•••'.slice(cost)}</span>
        </span>
      </span>
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
