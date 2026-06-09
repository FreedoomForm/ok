'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import type { LatLng } from '@/lib/geo'

// Fix Leaflet default icon issue in Next.js (webpack doesn't bundle the default image assets).
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function Recenter({ center }: { center: LatLng }) {
  const map = useMap()
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    const key = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`
    if (lastKey.current === key) return
    lastKey.current = key

    map.invalidateSize()
    map.stop()
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 13), { duration: 0.35 })
  }, [center.lat, center.lng, map])

  return null
}

function ClickToPick({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (point: LatLng) => void
}) {
  useMapEvents({
    click: (event) => {
      if (disabled) return
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

export function MiniLocationPickerMap({
  value,
  disabled,
  onChange,
}: {
  value: LatLng | null
  disabled?: boolean
  onChange: (point: LatLng) => void
}) {
  const center = useMemo<LatLng>(() => value ?? { lat: 41.2995, lng: 69.2401 }, [value])

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      dragging={!disabled}
      doubleClickZoom={!disabled}
      zoomControl
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickToPick disabled={disabled} onPick={onChange} />
      <Recenter center={center} />

      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={defaultIcon}
          draggable={!disabled}
          // react-leaflet event typing is permissive, but Leaflet's payload lives on `target`.
          eventHandlers={{
            dragend: (event) => {
              if (disabled) return
              const marker = event.target as unknown as L.Marker
              const next = marker.getLatLng()
              onChange({ lat: next.lat, lng: next.lng })
            },
          }}
        />
      )}
    </MapContainer>
  )
}

