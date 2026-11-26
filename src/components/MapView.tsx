import { Fragment, useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { PLACES, PLACE_BY_ID } from '../data/places'
import { PHOTOS } from '../data/photos'
import { BASE, fmt, type Plan } from '../lib/planner'
import type { Theme } from '../lib/themes'

export const dayColor = (i: number, theme: Theme) => theme.colors.days[i % 3]

interface Props {
  plan: Plan | null
  focusId: string | null
  theme: Theme
  onSelect: (id: string) => void
}

function pin(n: number, color: string, text: string, active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="rihla-pin${active ? ' active' : ''}" style="background:${color};color:${text}"><span>${n}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  })
}

const dot = L.divIcon({ className: '', html: '<div class="rihla-dot"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
const home = L.divIcon({
  className: '',
  html: '<div class="rihla-pin" style="background:#c8102e;width:22px;height:22px;border-radius:50%"><span style="transform:none;font-size:11px">H</span></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function PopupBody({ id, line }: { id: string; line: string }) {
  const p = PLACE_BY_ID[id]
  const photo = PHOTOS[id]
  return (
    <div className="w-[220px]">
      {photo && (
        <img src={photo.thumb} alt={p.name} loading="lazy" className="mb-2 aspect-[16/10] w-full rounded-lg object-cover" />
      )}
      <strong className="block text-[14px]">{p.name}</strong>
      <span className="block">{line}</span>
      {photo && (
        <a href={photo.page} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[10.5px] !text-[#5a6f74]">
          Photo: {photo.author}, {photo.licence}
        </a>
      )}
    </div>
  )
}

function Fit({ plan, focusId }: { plan: Plan | null; focusId: string | null }) {
  const map = useMap()
  // bumps whenever the map goes from hidden (0×0, e.g. another tab on a phone) to visible
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let visible = false
    const ro = new ResizeObserver(() => {
      const el = map.getContainer()
      const now = el.clientWidth > 0 && el.clientHeight > 0
      if (now) map.invalidateSize({ animate: false })
      else map.stop() // cancel a fly-to if the map is hidden mid-animation
      if (now && !visible) setShown((n) => n + 1)
      visible = now
    })
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  useEffect(() => {
    const el = map.getContainer()
    // animating a hidden map makes Leaflet compute NaN coordinates, so wait until it is visible
    if (el.clientWidth === 0 || el.clientHeight === 0) return
    const t = setTimeout(() => {
      map.invalidateSize({ animate: false })
      map.stop()
      if (focusId) {
        const p = PLACE_BY_ID[focusId]
        map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 13), { duration: 0.8 })
        return
      }
      const pts = plan?.days.flatMap((d) => d.stops.map((s) => PLACE_BY_ID[s.placeId])) ?? PLACES
      if (pts.length) map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.15), { maxZoom: 13 })
    }, 60)
    return () => clearTimeout(t)
  }, [plan, focusId, map, shown])
  return null
}

export default function MapView({ plan, focusId, theme, onSelect }: Props) {
  const planned = useMemo(() => new Set(plan?.days.flatMap((d) => d.stops.map((s) => s.placeId)) ?? []), [plan])

  return (
    <MapContainer center={[26.15, 50.56]} zoom={11} className="h-full w-full" zoomControl={false} attributionControl>
      <TileLayer
        key={theme.id}
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="rihla-tiles"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Fit plan={plan} focusId={focusId} />

      {plan && <Marker position={[BASE.lat, BASE.lng]} icon={home}><Tooltip>Start: {BASE.name}</Tooltip></Marker>}

      {PLACES.filter((p) => !planned.has(p.id)).map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={dot} eventHandlers={{ click: () => onSelect(p.id) }}>
          <Tooltip direction="top" offset={[0, -6]}>{p.name}</Tooltip>
        </Marker>
      ))}

      {plan?.days.map((day) => {
        const color = dayColor(day.index, theme)
        const line: [number, number][] = [[BASE.lat, BASE.lng], ...day.stops.map((s) => [PLACE_BY_ID[s.placeId].lat, PLACE_BY_ID[s.placeId].lng] as [number, number])]
        return (
          <Fragment key={`${day.index}-${day.stops.map((s) => s.placeId).join()}`}>
            <Polyline positions={line} pathOptions={{ color, weight: 4, opacity: 0.85, dashArray: day.index ? '1 8' : undefined, lineCap: 'round', className: day.index ? '' : 'route-draw' }} />
            {day.stops.map((s, i) => {
              const p = PLACE_BY_ID[s.placeId]
              return (
                <Marker key={s.placeId} position={[p.lat, p.lng]} icon={pin(i + 1, color, theme.colors.pinText, focusId === p.id)} eventHandlers={{ click: () => onSelect(p.id) }} zIndexOffset={focusId === p.id ? 1000 : 100}>
                  <Popup minWidth={220} maxWidth={240}>
                    <PopupBody id={p.id} line={`Day ${day.index + 1}, ${fmt(s.arrive)}–${fmt(s.leave)}`} />
                  </Popup>
                </Marker>
              )
            })}
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
