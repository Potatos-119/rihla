import { useState } from 'react'
import type { Interest, Place } from '../data/places'
import { PHOTOS } from '../data/photos'
import { ICON } from './bits'

/** Illustration colours per interest, used when a place has no free photo (or it fails to load). */
const ART: Record<Interest, [string, string, string]> = {
  heritage: ['#d6c7a8', '#b89b6a', '#0f3b45'],
  food: ['#f6d5d9', '#cf4a5f', '#6e1424'],
  nature: ['#cfe7dc', '#2a8c82', '#0f3b45'],
  sea: ['#bfe1e6', '#3d7480', '#08222a'],
  modern: ['#dfe6e8', '#86a9b0', '#0f3b45'],
  family: ['#efe3c8', '#d29a3c', '#4a3410'],
  shopping: ['#ead9c0', '#b07a2a', '#3e2a0c'],
  crafts: ['#ecd4cf', '#a8553f', '#3c1a12'],
}

interface Props {
  place: Place
  /** 'hero' and 'cover' use the large image and show the credit line */
  variant?: 'thumb' | 'hero' | 'cover'
  className?: string
  credit?: boolean
}

export function Illustration({ place, className = '' }: { place: Place; className?: string }) {
  const [light, mid, dark] = ART[place.tags[0]]
  const Icon = ICON[place.tags[0]]
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 85% 10%, ${light}, ${mid} 60%, ${dark})` }}
      role="img"
      aria-label={`Illustration for ${place.name}`}
    >
      {/* eight-point star lattice, a motif from Bahraini carved doors and screens */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" aria-hidden>
        <defs>
          <pattern id={`p-${place.id}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M14 2l3.5 8.5L26 14l-8.5 3.5L14 26l-3.5-8.5L2 14l8.5-3.5z" fill="none" stroke="#fff" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${place.id})`} />
      </svg>
      <Icon className="absolute right-[8%] bottom-[10%] h-[42%] w-auto text-white/85" strokeWidth={1.25} aria-hidden />
    </div>
  )
}

export default function PlacePhoto({ place, variant = 'thumb', className = '', credit }: Props) {
  const photo = PHOTOS[place.id]
  const [failed, setFailed] = useState(false)
  const showCredit = credit ?? variant !== 'thumb'

  if (!photo || failed) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Illustration place={place} className="h-full w-full" />
      </div>
    )
  }

  return (
    <figure className={`relative m-0 overflow-hidden bg-[var(--surface-2)] ${className}`}>
      <img
        src={variant === 'thumb' ? photo.thumb : photo.src}
        alt={`${place.name}, ${place.area}`}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {showCredit && <Credit photo={photo} top={variant === 'cover'} />}
    </figure>
  )
}

export function Credit({ photo, top = false }: { photo: (typeof PHOTOS)[string]; top?: boolean }) {
  return (
    <figcaption className={`absolute right-0 z-10 max-w-[62%] truncate ${top ? 'top-0 rounded-bl-md' : 'bottom-0 rounded-tl-md'} bg-black/55 px-1.5 py-0.5 text-[10.5px] leading-tight text-white/90`}>
      Photo: {photo.author},{' '}
      {photo.licenceUrl ? (
        <a href={photo.licenceUrl} target="_blank" rel="noreferrer" className="underline decoration-white/40 underline-offset-2">
          {photo.licence}
        </a>
      ) : (
        photo.licence
      )}
      , via{' '}
      <a href={photo.page} target="_blank" rel="noreferrer" className="underline decoration-white/40 underline-offset-2">
        Wikimedia Commons
      </a>
    </figcaption>
  )
}
