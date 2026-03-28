'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const orderIcon = L.divIcon({
  className: 'neuro-marker-shell',
  html: '<div class="neuro-marker neuro-marker--order"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

const courierIcon = L.divIcon({
  className: 'neuro-marker-shell',
  html: '<div class="neuro-marker neuro-marker--courier"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

interface Order {
  id: string
  orderNumber: number
  customer: {
    name: string
    phone: string
  }
  deliveryAddress: string
  latitude: number | null
  longitude: number | null
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  orderStatus: string
  deliveryDate?: string
  createdAt: string
  [key: string]: any
}

interface CourierMapProps {
  orders: Order[]
  currentLocation?: { lat: number; lng: number }
  onMarkerClick: (order: Order) => void
}

function MapViewport({ points }: { points: Array<[number, number]> }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return

    setTimeout(() => {
      map.invalidateSize()
      if (points.length === 1) {
        map.flyTo(points[0], 15, { duration: 0.5 })
        return
      }

      map.fitBounds(L.latLngBounds(points), {
        padding: [40, 40],
        maxZoom: 16,
      })
    }, 30)
  }, [map, points])

  return null
}

export default function CourierMap({ orders, currentLocation, onMarkerClick }: CourierMapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const points = useMemo<Array<[number, number]>>(() => {
    const pts: Array<[number, number]> = []
    if (currentLocation) pts.push([currentLocation.lat, currentLocation.lng])
    for (const order of orders) {
      if (order.latitude != null && order.longitude != null) {
        pts.push([order.latitude, order.longitude])
      }
    }
    return pts
  }, [currentLocation, orders])

  const center: [number, number] = points.length > 0 ? points[0] : [41.2995, 69.2401]

  if (!isMounted) {
    return <div className="h-full w-full animate-pulse rounded-base border-2 border-border bg-secondary-background" />
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-base border-2 border-border bg-card shadow-shadow">
      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-base border-2 border-border bg-main px-2.5 py-1 text-[10px] font-heading uppercase tracking-wider text-main-foreground shadow-shadow">
        Delivery map
      </div>

      <MapContainer center={center} zoom={13} className="neuro-map h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {orders.map((order) =>
          order.latitude != null && order.longitude != null ? (
            <Marker
              key={order.id}
              position={[order.latitude, order.longitude]}
              icon={orderIcon}
              eventHandlers={{ click: () => onMarkerClick(order) }}
            >
              <Popup>
                <button type="button" className="text-left text-xs font-semibold" onClick={() => onMarkerClick(order)}>
                  #{order.orderNumber} - {order.deliveryAddress}
                </button>
              </Popup>
            </Marker>
          ) : null
        )}

        {currentLocation ? (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={courierIcon}>
            <Popup>
              <div className="text-xs font-semibold">Your location</div>
            </Popup>
          </Marker>
        ) : null}

        <MapViewport points={points} />
      </MapContainer>
    </div>
  )
}

