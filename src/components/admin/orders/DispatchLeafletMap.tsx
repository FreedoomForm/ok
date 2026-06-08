'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

type LatLng = { lat: number; lng: number }

export type DispatchMapMarker = {
  id: string
  position: LatLng
  color: string
  label: string
  popup?: string
}

export type DispatchMapPolyline = {
  id: string
  color: string
  positions: LatLng[]
}

// Fix Leaflet default icon issue in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function createLabeledIcon(color: string, label: string) {
  const safeLabel = String(label ?? '')
  const html = `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      background: ${color};
      border: 1px solid rgba(255,255,255,0.9);
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
      display:flex;
      align-items:center;
      justify-content:center;
      color: #0b1220;
      font-weight: 800;
      font-size: 12px;
    ">
      ${safeLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  })
}

function MapViewport({
  suspendFit,
  warehouse,
  markers,
  polylines,
}: {
  suspendFit?: boolean
  warehouse?: LatLng | null
  markers: DispatchMapMarker[]
  polylines: DispatchMapPolyline[]
}) {
  const map = useMap()
  const lastFitKey = useRef<string | null>(null)

  useEffect(() => {
    let count = 0
    let firstPoint: [number, number] | null = null
    let minLat = Infinity
    let maxLat = -Infinity
    let minLng = Infinity
    let maxLng = -Infinity

    const addPoint = (lat: number, lng: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      count += 1
      if (!firstPoint) firstPoint = [lat, lng]
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    }

    if (warehouse) addPoint(warehouse.lat, warehouse.lng)
    for (const m of markers) addPoint(m.position.lat, m.position.lng)
    for (const line of polylines) for (const p of line.positions) addPoint(p.lat, p.lng)

    const hasPoints = count > 0 && !!firstPoint

    let fitKey: string | null = null
    let singlePoint: [number, number] | null = null
    if (hasPoints) {
      fitKey = `${count}:${minLat.toFixed(5)},${minLng.toFixed(5)}:${maxLat.toFixed(5)},${maxLng.toFixed(5)}`
      if (lastFitKey.current === fitKey) fitKey = null
      singlePoint = firstPoint
    }

    // Ensures map is measured correctly inside sheet/modal (it animates in).
    const fit = () => {
      map.invalidateSize()

      if (suspendFit) return
      if (!fitKey || !singlePoint) return
      lastFitKey.current = fitKey

      map.stop()
      if (count === 1) {
        map.flyTo(singlePoint, 14, { duration: 0.5 })
        return
      }

      map.fitBounds(
        L.latLngBounds([
          [minLat, minLng],
          [maxLat, maxLng],
        ]),
        {
          padding: [40, 40],
          maxZoom: 15,
        }
      )
    }

    const t1 = setTimeout(fit, 60)
    const t2 = setTimeout(fit, 380)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map, markers, polylines, suspendFit, warehouse])

  return null
}

export default function DispatchLeafletMap({
  suspendFit,
  warehouse,
  markers,
  polylines,
}: {
  suspendFit?: boolean
  warehouse?: LatLng | null
  markers: DispatchMapMarker[]
  polylines: DispatchMapPolyline[]
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const center = useMemo<[number, number]>(() => {
    if (warehouse) return [warehouse.lat, warehouse.lng]
    if (markers.length > 0) return [markers[0].position.lat, markers[0].position.lng]
    return [41.2995, 69.2401]
  }, [markers, warehouse])

 if (!isMounted) return <div className="h-full w-full animate-pulse bg-muted/30" />

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {warehouse && (
        <Marker position={[warehouse.lat, warehouse.lng]} icon={defaultIcon}>
          <Popup>Склад (точка старта)</Popup>
        </Marker>
      )}

      {polylines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: line.color, weight: 4, opacity: 0.8 }}
        />
      ))}

      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.position.lat, m.position.lng]}
          icon={createLabeledIcon(m.color, m.label)}
        >
          <Popup>{m.popup || m.label}</Popup>
        </Marker>
      ))}

      <MapViewport suspendFit={suspendFit} warehouse={warehouse} markers={markers} polylines={polylines} />
    </MapContainer>
  )
}
