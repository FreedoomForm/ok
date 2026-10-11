'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// C9 / R40, R43, R44: the routes geo layer on a real map — square initials
// markers for the day's orders, click-drawn polygon in the courier color,
// ORS route line that redraws when the stop order changes.

type LatLng = { lat: number; lng: number }

export type RoutesMapMarker = {
  id: string
  position: LatLng
  color: string
  label: string
  popup?: string
  highlighted?: boolean
}

export type RoutesMapProps = {
  markers: RoutesMapMarker[]
  /** Draft polygon vertices (drawing mode) — click adds, double-click closes. */
  draftPoints?: LatLng[]
  isDrawing?: boolean
  onMapClick?: (position: LatLng) => void
  onPolygonClose?: () => void
  /** Saved polygon of the selected route (read mode). */
  polygon?: LatLng[] | null
  polygonColor?: string
  /** ORS line by the route stops — redraws whenever the order changes. */
  routeLine?: LatLng[] | null
  routeLineColor?: string
  lineKey?: string
}

function createSquareIcon(color: string, label: string, highlighted: boolean) {
  const safeLabel = String(label ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 6px;
      background: #ffffff;
      border: 3px solid ${color};
      box-shadow: ${highlighted ? '0 0 0 4px ' + color + '55, ' : ''}0 4px 12px rgba(0,0,0,0.22);
      display:flex;
      align-items:center;
      justify-content:center;
      color: #0b1220;
      font-weight: 800;
      font-size: 11px;
      line-height: 1;
    ">
      ${safeLabel}
    </div>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })
}

function ClickHandler({ onMapClick, onPolygonClose, isDrawing }: { onMapClick?: (position: LatLng) => void; onPolygonClose?: () => void; isDrawing?: boolean }) {
  useMapEvents({
    click(event) {
      if (isDrawing) onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
    dblclick() {
      if (isDrawing) onPolygonClose?.()
    },
  })
  return null
}

function FitBounds({ markers, polygon, routeLine }: { markers: RoutesMapMarker[]; polygon: LatLng[] | null; routeLine: LatLng[] | null }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = [
      ...markers.map((marker) => [marker.position.lat, marker.position.lng] as [number, number]),
      ...(polygon ?? []).map((point) => [point.lat, point.lng] as [number, number]),
      ...(routeLine ?? []).map((point) => [point.lat, point.lng] as [number, number]),
    ].filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))
    if (points.length === 0) return
    const timer = setTimeout(() => {
      map.invalidateSize()
      if (points.length === 1) {
        map.setView(points[0], 14)
        return
      }
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 })
    }, 80)
    return () => clearTimeout(timer)
  }, [map, markers, polygon, routeLine])
  return null
}

export default function RoutesLeafletMap({
  markers,
  draftPoints = [],
  isDrawing = false,
  onMapClick,
  onPolygonClose,
  polygon = null,
  polygonColor = '#2563eb',
  routeLine = null,
  routeLineColor = '#2563eb',
  lineKey,
}: RoutesMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  const center = useMemo<[number, number]>(() => {
    if (markers.length > 0) return [markers[0].position.lat, markers[0].position.lng]
    return [41.2995, 69.2401]
  }, [markers])

  const polylineKey = useMemo(() => lineKey ?? (routeLine ? `${routeLine.length}:${routeLine[0]?.lat ?? 0}` : 'none'), [lineKey, routeLine])

  if (!isMounted) return <div className="h-full w-full animate-pulse border bg-muted/30" />

  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} doubleClickZoom={isDrawing ? false : undefined}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler isDrawing={isDrawing} onMapClick={onMapClick} onPolygonClose={onPolygonClose} />
      {/* The draft polygon does not participate in fitting — the view stays
          stable while the user clicks out the vertices. */}
      <FitBounds markers={markers} polygon={polygon} routeLine={routeLine} />

      {/* Saved route polygon — semi-transparent courier color (R43). */}
      {polygon && polygon.length >= 3 ? (
        <Polygon
          positions={polygon.map((point) => [point.lat, point.lng] as [number, number])}
          pathOptions={{ color: polygonColor, fillColor: polygonColor, fillOpacity: 0.18, weight: 2 }}
        />
      ) : null}

      {/* Draft polygon while drawing — vertices + closing preview. */}
      {draftPoints.length > 0 ? (
        <>
          <Polyline
            positions={draftPoints.length >= 2 ? [...draftPoints.map((point) => [point.lat, point.lng] as [number, number])] : []}
            pathOptions={{ color: polygonColor, dashArray: '6 6', weight: 2 }}
          />
          {draftPoints.map((point, index) => (
            <Marker key={`draft-${index}-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`} position={[point.lat, point.lng]} icon={L.divIcon({ className: '', html: `<div style="width:12px;height:12px;border-radius:9999px;background:${polygonColor};border:2px solid #fff"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] })} />
          ))}
        </>
      ) : null}

      {/* R43/R44: the route line follows the roads when ORS responds, straight
          segments as the fallback — redraws on every stop reorder (lineKey). */}
      {routeLine && routeLine.length >= 2 ? (
        <Polyline
          key={polylineKey}
          positions={routeLine.map((point) => [point.lat, point.lng] as [number, number])}
          pathOptions={{ color: routeLineColor, weight: 4, opacity: 0.85 }}
        />
      ) : null}

      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.position.lat, marker.position.lng]} icon={createSquareIcon(marker.color, marker.label, marker.highlighted ?? false)}>
          <Popup>{marker.popup || marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
