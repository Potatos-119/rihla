import { Fragment, useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { PLACES, PLACE_BY_ID } from '../data/places'
import { BASE, fmt, type Plan } from '../lib/planner'

export const DAY_COLORS = ['#0f3b45', '#2a8c82', '#b07a2a']
const DAY_COLORS_DARK = ['#7fd6cb', '#e8c37a', '#f2a1ad']
export const dayColor = (i: number, dark: boolean) => (dark ? DAY_COLORS_DARK : DAY_COLORS)[i % 3]

interface Props {
  plan: Plan | null
  focusId: string | null
  dark: boolean
  onSelect: (id: string) => void
}

function pin(n: number, color: string, active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="rihla-pin${active ? ' active' : ''}" style="background:${color}"><span>${n}</span></div>`,
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

function Fit({ plan, focusId }: { plan: Plan | null; focusId: string | null }) {
  const map = useMap()
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      if (focusId) {
        const p = PLACE_BY_ID[focusId]
        map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 13), { duration: 0.8 })
        return
      }
      const pts = plan?.days.flatMap((d) => d.stops.map((s) => PLACE_BY_ID[s.placeId])) ?? PLACES
      if (pts.length) map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.15), { maxZoom: 13 })
    }, 60)
    return () => clearTimeout(t)
  }, [plan, focusId, map])
  return null
}

export default function MapView({ plan, focusId, dark, onSelect }: Props) {
  const planned = useMemo(() => new Set(plan?.days.flatMap((d) => d.stops.map((s) => s.placeId)) ?? []), [plan])

  return (
    <MapContainer center={[26.15, 50.56]} zoom={11} className="h-full w-full" zoomControl={false} attributionControl>
      <TileLayer
        key={dark ? 'dark' : 'light'}
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className={dark ? 'tiles-dark' : 'tiles-light'}
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
        const color = dayColor(day.index, dark)
        const line: [number, number][] = [[BASE.lat, BASE.lng], ...day.stops.map((s) => [PLACE_BY_ID[s.placeId].lat, PLACE_BY_ID[s.placeId].lng] as [number, number])]
        return (
          <Fragment key={`${day.index}-${day.stops.map((s) => s.placeId).join()}`}>
            <Polyline positions={line} pathOptions={{ color, weight: 4, opacity: 0.85, dashArray: day.index ? '1 8' : undefined, lineCap: 'round', className: day.index ? '' : 'route-draw' }} />
            {day.stops.map((s, i) => {
              const p = PLACE_BY_ID[s.placeId]
              return (
                <Marker key={s.placeId} position={[p.lat, p.lng]} icon={pin(i + 1, color, focusId === p.id)} eventHandlers={{ click: () => onSelect(p.id) }} zIndexOffset={focusId === p.id ? 1000 : 100}>
                  <Popup>
                    <strong>{p.name}</strong>
                    <br />
                    Day {day.index + 1}, {fmt(s.arrive)}–{fmt(s.leave)}
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
