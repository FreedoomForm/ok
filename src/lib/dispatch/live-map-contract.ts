import type { LatLng } from '@/lib/geo'

export type LiveMapPoint = {
  id: string
  name: string
  lat: number
  lng: number
}

export type OrderPoint = {
  id: string
  orderNumber: number
  customerName: string
  status: string
  deliveryTime: string
  courierId: string | null
  courierName: string | null
  lat: number
  lng: number
}

export type LiveMapPayload = {
  couriers: LiveMapPoint[]
  clients: LiveMapPoint[]
  orders: OrderPoint[]
  warehouse: LatLng | null
}

export type OptimizedRoute = {
  containerId: string
  polyline: LatLng[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePoint(value: unknown, fallbackName: string): LiveMapPoint | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const lat = finiteNumber(value.lat)
  const lng = finiteNumber(value.lng)
  if (lat === null || lng === null) return null
  const name = typeof value.name === 'string' && value.name.trim() ? value.name : fallbackName
  return { id: value.id, name, lat, lng }
}

function parseOrder(value: unknown): OrderPoint | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const lat = finiteNumber(value.lat)
  const lng = finiteNumber(value.lng)
  if (lat === null || lng === null) return null
  return {
    id: value.id,
    orderNumber: typeof value.orderNumber === 'number' ? value.orderNumber : 0,
    customerName: typeof value.customerName === 'string' ? value.customerName : 'Client',
    status: typeof value.status === 'string' ? value.status : 'NEW',
    deliveryTime: typeof value.deliveryTime === 'string' ? value.deliveryTime : '',
    courierId: typeof value.courierId === 'string' && value.courierId ? value.courierId : null,
    courierName: typeof value.courierName === 'string' && value.courierName ? value.courierName : null,
    lat,
    lng,
  }
}

function parsePolyline(value: unknown): LatLng[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((point) => {
    if (!isRecord(point)) return []
    const lat = finiteNumber(point.lat)
    const lng = finiteNumber(point.lng)
    return lat === null || lng === null ? [] : [{ lat, lng }]
  })
}

export function parseLiveMapPayload(value: unknown): LiveMapPayload {
  const payload = isRecord(value) ? value : {}
  const couriers = Array.isArray(payload.couriers)
    ? payload.couriers.flatMap((point) => {
        const parsed = parsePoint(point, 'Courier')
        return parsed ? [parsed] : []
      })
    : []
  const clients = Array.isArray(payload.clients)
    ? payload.clients.flatMap((point) => {
        const parsed = parsePoint(point, 'Client')
        return parsed ? [parsed] : []
      })
    : []
  const orders = Array.isArray(payload.orders)
    ? payload.orders.flatMap((order) => {
        const parsed = parseOrder(order)
        return parsed ? [parsed] : []
      })
    : []
  const warehouse = isRecord(payload.warehouse)
    ? (() => {
        const lat = finiteNumber(payload.warehouse.lat)
        const lng = finiteNumber(payload.warehouse.lng)
        return lat === null || lng === null ? null : { lat, lng }
      })()
    : null
  return { couriers, clients, orders, warehouse }
}

export function parseOptimizedRoutes(value: unknown): Map<string, OptimizedRoute> {
  const payload = isRecord(value) ? value : {}
  const routes = Array.isArray(payload.routes) ? payload.routes : []
  const parsed = new Map<string, OptimizedRoute>()
  for (const route of routes) {
    if (!isRecord(route) || typeof route.containerId !== 'string') continue
    parsed.set(route.containerId, {
      containerId: route.containerId,
      polyline: parsePolyline(route.polyline),
    })
  }
  return parsed
}
