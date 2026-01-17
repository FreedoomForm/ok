'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet icon issue in Next.js
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

interface Order {
    id: string
    orderNumber: number
    customer: {
        name: string
        phone: string
    }
    deliveryAddress: string
    latitude: number
    longitude: number
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

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.flyTo(center, 15)
    }, [center, map])
    return null
}

export default function CourierMap({ orders, currentLocation, onMarkerClick }: CourierMapProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return <div className="h-full w-full bg-slate-100 animate-pulse rounded-lg" />

    // Calculate center based on current location or first order or default
    const center: [number, number] = currentLocation
        ? [currentLocation.lat, currentLocation.lng]
        : orders.length > 0 && orders[0].latitude && orders[0].longitude
            ? [orders[0].latitude, orders[0].longitude]
            : [41.2995, 69.2401] // Default to Tashkent

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {orders.map(order => (
                order.latitude && order.longitude && (
                    <Marker
                        key={order.id}
                        position={[order.latitude, order.longitude]}
                        icon={icon}
                        eventHandlers={{
                            click: () => onMarkerClick(order)
                        }}
                    >
                        <Popup>
                            <div className="cursor-pointer" onClick={() => onMarkerClick(order)}>
                                {order.deliveryAddress}
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}

            {currentLocation && (
                <Marker position={[currentLocation.lat, currentLocation.lng]} icon={icon}>
                    <Popup>
                        Ваше местоположение
                    </Popup>
                </Marker>
            )}

            <MapUpdater center={center} />
        </MapContainer>
    )
}
