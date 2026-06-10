'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Admin, Client, Order } from '@/components/admin/dashboard/types'
import type { LatLng } from '@/modules/shared/geo'
import { extractCoordsFromText } from '@/modules/shared/geo'
import { getCourierColor } from '@/lib/courier-colors'
import { Building2, LocateFixed, Navigation, RefreshCw, Route, Users } from 'lucide-react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { toast } from 'sonner'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const ROUTE_DEVIATION_METERS = 140
const ROUTE_REROUTE_COOLDOWN_MS = 15000
const ROUTE_TRIM_MAX_DISTANCE_METERS = 900
const ACTIVE_ROUTE_STATUSES = new Set(['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED'])
const ORDER_STATUSES = ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'DELIVERED', 'FAILED', 'CANCELED']

type LiveMapPoint = { id: string; name: string; lat: number; lng: number }
type OrderPoint = {
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
type RouteBuildInput = {
  courierId: string
  startPoint: LatLng
  stops: Array<{ orderId: string; lat: number; lng: number }>
}
type CourierRouteState = {
  courierId: string
  color: string
  baselinePolyline: LatLng[]
  visiblePolyline: LatLng[]
  deviationMeters: number
}
type CourierDraft = { name: string; lat: string; lng: string }
type OrderDraft = {
  deliveryTime: string
  deliveryAddress: string
  courierId: string
  status: string
  lat: string
  lng: string
}

function isFiniteCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
function normalizePoints(points: LiveMapPoint[]) { return [...points].sort((a, b) => a.id.localeCompare(b.id)) }
function normalizeOrders(points: OrderPoint[]) { return [...points].sort((a, b) => a.id.localeCompare(b.id)) }
function equalPoints(a: LiveMapPoint[], b: LiveMapPoint[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].name !== b[i].name || a[i].lat !== b[i].lat || a[i].lng !== b[i].lng) return false
  }
  return true
}
function equalOrders(a: OrderPoint[], b: OrderPoint[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id || a[i].orderNumber !== b[i].orderNumber || a[i].customerName !== b[i].customerName ||
      a[i].status !== b[i].status || a[i].deliveryTime !== b[i].deliveryTime || a[i].courierId !== b[i].courierId ||
      a[i].lat !== b[i].lat || a[i].lng !== b[i].lng
    ) return false
  }
  return true
}
function polylineEquals(a: LatLng[], b: LatLng[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].lat - b[i].lat) > 0.000001 || Math.abs(a[i].lng - b[i].lng) > 0.000001) return false
  }
  return true
}
function toCourierPoints(couriers: Admin[]): LiveMapPoint[] {
  return normalizePoints(
    couriers.filter((c) => isFiniteCoord(c.latitude) && isFiniteCoord(c.longitude)).map((c) => ({
      id: c.id, name: c.name || 'Courier', lat: c.latitude as number, lng: c.longitude as number,
    }))
  )
}
function toClientPoints(clients: Client[]): LiveMapPoint[] {
  return normalizePoints(
    clients.filter((c) => isFiniteCoord(c.latitude) && isFiniteCoord(c.longitude)).map((c) => ({
      id: c.id, name: c.nickName?.trim() || c.name || 'Client', lat: c.latitude as number, lng: c.longitude as number,
    }))
  )
}
function toOrderPoints(orders: Order[]): OrderPoint[] {
  return normalizeOrders(
    orders.map((o) => {
      const parsed = extractCoordsFromText(o.deliveryAddress || '')
      const lat = isFiniteCoord(o.latitude) ? o.latitude : parsed?.lat
      const lng = isFiniteCoord(o.longitude) ? o.longitude : parsed?.lng
      if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return null
      return {
        id: o.id,
        orderNumber: typeof o.orderNumber === 'number' ? o.orderNumber : 0,
        customerName: o.customer?.name || o.customerName || 'Client',
        status: o.orderStatus || 'NEW',
        deliveryTime: o.deliveryTime || '',
        courierId: typeof o.courierId === 'string' && o.courierId ? o.courierId : null,
        courierName: o.courierName || null,
        lat, lng,
      } satisfies OrderPoint
    }).filter((item): item is OrderPoint => !!item)
  )
}
function createOrderDraft(order: OrderPoint): OrderDraft {
  return {
    deliveryTime: order.deliveryTime || '',
    deliveryAddress: `${order.lat.toFixed(6)}, ${order.lng.toFixed(6)}`,
    courierId: order.courierId || '',
    status: order.status || 'NEW',
    lat: order.lat.toFixed(6),
    lng: order.lng.toFixed(6),
  }
}
function createCourierDraft(courier: LiveMapPoint): CourierDraft {
  return { name: courier.name, lat: courier.lat.toFixed(6), lng: courier.lng.toFixed(6) }
}

function createCourierIcon(color: string, label: string, offRoute: boolean) {
  const safeLabel = String(label || '?').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 2).toUpperCase()
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
 html: `<div style="width:36px;height:36px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;color:#020617;font-size:11px;font-weight:900;box-shadow:0 12px 24px rgba(2,6,23,0.45),0 0 0 ${offRoute ? '3px rgba(248,113,113,0.65)' : '2px rgba(15,23,42,0.2)'};">${safeLabel}</div>`,
  })
}
function createWarehouseIcon() {
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
 html: '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#fef3c7,#f59e0b);display:flex;align-items:center;justify-content:center;color:#7c2d12;font-size:14px;font-weight:900;box-shadow:0 12px 24px rgba(120,53,15,0.35);">W</div>',
  })
}
function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
function closestPointOnSegment(point: LatLng, start: LatLng, end: LatLng) {
  const latScale = 110540
  const lngScale = 111320 * Math.cos((point.lat * Math.PI) / 180)
  const ax = start.lng * lngScale, ay = start.lat * latScale
  const bx = end.lng * lngScale, by = end.lat * latScale
  const px = point.lng * lngScale, py = point.lat * latScale
  const dx = bx - ax, dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (lengthSq <= 0) return { point: start, distanceMeters: haversineMeters(point, start) }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
  const projected = { lat: start.lat + (end.lat - start.lat) * t, lng: start.lng + (end.lng - start.lng) * t }
  return { point: projected, distanceMeters: haversineMeters(point, projected) }
}
function closestPointOnPolyline(polyline: LatLng[], point: LatLng) {
  if (!Array.isArray(polyline) || polyline.length === 0) return null
  if (polyline.length === 1) return { point: polyline[0], segmentIndex: 0, distanceMeters: haversineMeters(point, polyline[0]) }
  let best: { point: LatLng; segmentIndex: number; distanceMeters: number } | null = null
  for (let i = 0; i < polyline.length - 1; i++) {
    const projected = closestPointOnSegment(point, polyline[i], polyline[i + 1])
    if (!best || projected.distanceMeters < best.distanceMeters) {
      best = { point: projected.point, segmentIndex: i, distanceMeters: projected.distanceMeters }
    }
  }
  return best
}
function normalizePolyline(points: LatLng[]) {
  const out: LatLng[] = []
  for (const point of points) {
    if (!isFiniteCoord(point?.lat) || !isFiniteCoord(point?.lng)) continue
    const last = out[out.length - 1]
    if (last && Math.abs(last.lat - point.lat) < 0.0000005 && Math.abs(last.lng - point.lng) < 0.0000005) continue
    out.push({ lat: point.lat, lng: point.lng })
  }
  return out
}
function trimPolylineFromPosition(polyline: LatLng[], position: LatLng) {
  const normalized = normalizePolyline(polyline)
  if (normalized.length < 2) return normalized
  const closest = closestPointOnPolyline(normalized, position)
  if (!closest) return normalized
  const trimmed = [closest.point, ...normalized.slice(closest.segmentIndex + 1)]
  return trimmed.length >= 2 ? normalizePolyline(trimmed) : [closest.point, normalized[normalized.length - 1]]
}
function buildFallbackPolyline(input: RouteBuildInput) {
  return normalizePolyline([input.startPoint, ...input.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))])
}
function FitToVisiblePoints({ points, fitTick }: { points: Array<[number, number]>; fitTick: number }) {
  const map = useMap()
  useEffect(() => {
    if (fitTick <= 0 || points.length === 0) return
    const task = setTimeout(() => {
      map.invalidateSize()
      if (points.length === 1) {
        map.flyTo(points[0], 14, { duration: 0.5 })
        return
      }
      map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 15 })
    }, 20)
    return () => clearTimeout(task)
  }, [fitTick, map, points])
  return null
}

export default function MiddleLiveMap({
  active, couriers, clients, orders, warehousePoint, selectedDateISO, onDataChanged, onWarehouseUpdated,
}: {
  active: boolean
  couriers: Admin[]
  clients: Client[]
  orders: Order[]
  warehousePoint?: LatLng | null
  selectedDateISO?: string
  onDataChanged?: () => void
  onWarehouseUpdated?: (point: LatLng | null) => void
}) {
  const [liveCouriers, setLiveCouriers] = useState<LiveMapPoint[]>(() => toCourierPoints(couriers))
  const [liveClients, setLiveClients] = useState<LiveMapPoint[]>(() => toClientPoints(clients))
  const [liveOrders, setLiveOrders] = useState<OrderPoint[]>(() => toOrderPoints(orders))
  const [liveWarehouse, setLiveWarehouse] = useState<LatLng | null>(warehousePoint ?? null)
  const [showCouriers, setShowCouriers] = useState(true)
  const [showClients, setShowClients] = useState(true)
  const [showOrders, setShowOrders] = useState(true)
  const [showWarehouse, setShowWarehouse] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [fitTick, setFitTick] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [routeStateByCourier, setRouteStateByCourier] = useState<Record<string, CourierRouteState>>({})
  const [courierDraftById, setCourierDraftById] = useState<Record<string, CourierDraft>>({})
  const [orderDraftById, setOrderDraftById] = useState<Record<string, OrderDraft>>({})
  const [warehouseDraft, setWarehouseDraft] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' })
  const [savingEntityId, setSavingEntityId] = useState<string | null>(null)

  const didAutofitRef = useRef(false)
  const inFlightRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const etagRef = useRef<string | null>(null)
  const routeSignatureRef = useRef('')
  const routeBuildInFlightRef = useRef(false)
  const routeRerouteCooldownRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const fallback = toCourierPoints(couriers)
    setLiveCouriers((prev) => (equalPoints(prev, fallback) ? prev : fallback))
  }, [couriers])
  useEffect(() => {
    const fallback = toClientPoints(clients)
    setLiveClients((prev) => (equalPoints(prev, fallback) ? prev : fallback))
  }, [clients])
  useEffect(() => {
    const fallback = toOrderPoints(orders)
    setLiveOrders((prev) => (equalOrders(prev, fallback) ? prev : fallback))
  }, [orders])
  useEffect(() => {
    const nextWarehouse = warehousePoint ?? null
    setLiveWarehouse((prev) => {
      if (!prev && !nextWarehouse) return prev
      if (prev && nextWarehouse && Math.abs(prev.lat - nextWarehouse.lat) < 0.0000005 && Math.abs(prev.lng - nextWarehouse.lng) < 0.0000005) return prev
      return nextWarehouse
    })
  }, [warehousePoint])
  useEffect(() => {
    if (!liveWarehouse) return
    setWarehouseDraft({ lat: liveWarehouse.lat.toFixed(6), lng: liveWarehouse.lng.toFixed(6) })
  }, [liveWarehouse])

  const liveCouriersById = useMemo(() => new Map(liveCouriers.map((c) => [c.id, c])), [liveCouriers])
  const routeInputByCourier = useMemo(() => {
    const grouped = new Map<string, OrderPoint[]>()
    for (const order of liveOrders) {
      if (!order.courierId || !ACTIVE_ROUTE_STATUSES.has(order.status)) continue
      if (!grouped.has(order.courierId)) grouped.set(order.courierId, [])
      grouped.get(order.courierId)?.push(order)
    }
    const byCourier = new Map<string, RouteBuildInput>()
    for (const [courierId, courierOrders] of grouped.entries()) {
      const courier = liveCouriersById.get(courierId)
      const startPoint = courier
        ? ({ lat: courier.lat, lng: courier.lng } as LatLng)
        : liveWarehouse
      if (!startPoint) continue
      courierOrders.sort((a, b) => a.orderNumber - b.orderNumber)
      const stops = courierOrders.map((order) => ({ orderId: order.id, lat: order.lat, lng: order.lng }))
      if (stops.length === 0) continue
      byCourier.set(courierId, { courierId, startPoint, stops })
    }
    return byCourier
  }, [liveCouriersById, liveOrders, liveWarehouse])
  const routeSignature = useMemo(() => {
    return Array.from(routeInputByCourier.values())
      .map((input) => `${input.courierId}:${input.stops.map((s) => `${s.orderId}:${s.lat.toFixed(6)}:${s.lng.toFixed(6)}`).join('|')}`)
      .sort()
      .join('||')
  }, [routeInputByCourier])

  const buildRoutes = useCallback(async (targetCourierIds?: string[]) => {
    if (!active || routeBuildInFlightRef.current) return
    const targetInputs = Array.from(routeInputByCourier.values()).filter((input) => !targetCourierIds || targetCourierIds.includes(input.courierId))
    if (targetInputs.length === 0) return
    routeBuildInFlightRef.current = true
    try {
      const response = await fetch('/api/admin/dispatch/ors-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: targetInputs.map((input) => ({ containerId: input.courierId, startPoint: input.startPoint, stops: input.stops })) }),
      })
      const payload = response.ok ? await response.json().catch(() => null) : null
      const routes = Array.isArray(payload?.routes) ? payload.routes : []
      const routeByCourier = new Map<string, any>(routes.map((route: any) => [String(route?.containerId), route]))
      const nowMs = Date.now()
      setRouteStateByCourier((prev) => {
        const next = { ...prev }
        for (const input of targetInputs) {
          const courier = liveCouriersById.get(input.courierId)
          const route = routeByCourier.get(input.courierId)
          const polyline = Array.isArray(route?.polyline)
            ? normalizePolyline(route.polyline.map((p: any) => ({ lat: Number(p?.lat), lng: Number(p?.lng) })).filter((p: LatLng) => isFiniteCoord(p.lat) && isFiniteCoord(p.lng)))
            : []
          const baseline = polyline.length >= 2 ? polyline : buildFallbackPolyline(input)
          const courierPos = courier ? { lat: courier.lat, lng: courier.lng } : input.startPoint
          const closest = closestPointOnPolyline(baseline, courierPos)
          const visible = closest && closest.distanceMeters <= ROUTE_TRIM_MAX_DISTANCE_METERS ? trimPolylineFromPosition(baseline, courierPos) : baseline
          next[input.courierId] = { courierId: input.courierId, color: getCourierColor(input.courierId), baselinePolyline: baseline, visiblePolyline: visible.length >= 2 ? visible : baseline, deviationMeters: closest?.distanceMeters ?? 0 }
          routeRerouteCooldownRef.current[input.courierId] = nowMs
        }
        if (!targetCourierIds) {
          for (const courierId of Object.keys(next)) if (!routeInputByCourier.has(courierId)) delete next[courierId]
        }
        return next
      })
    } finally {
      routeBuildInFlightRef.current = false
    }
  }, [active, liveCouriersById, routeInputByCourier])

  useEffect(() => {
    if (!active || routeSignature === routeSignatureRef.current) return
    routeSignatureRef.current = routeSignature
    if (!routeSignature) {
      setRouteStateByCourier({})
      return
    }
    void buildRoutes()
  }, [active, buildRoutes, routeSignature])

  useEffect(() => {
    if (!active || liveCouriers.length === 0) return
    const now = Date.now()
    const toRebuild: string[] = []
    setRouteStateByCourier((prev) => {
      let changed = false
      const next = { ...prev }
      for (const [courierId, state] of Object.entries(prev)) {
        const courier = liveCouriersById.get(courierId)
        if (!courier || state.baselinePolyline.length < 2) continue
        const courierPos = { lat: courier.lat, lng: courier.lng }
        const closest = closestPointOnPolyline(state.baselinePolyline, courierPos)
        if (!closest) continue
        const visible = closest.distanceMeters <= ROUTE_TRIM_MAX_DISTANCE_METERS ? trimPolylineFromPosition(state.baselinePolyline, courierPos) : state.visiblePolyline
        const visibleChanged = !polylineEquals(visible, state.visiblePolyline)
        const deviationChanged = Math.abs(state.deviationMeters - closest.distanceMeters) > 1
        if (visibleChanged || deviationChanged) {
          next[courierId] = { ...state, visiblePolyline: visible, deviationMeters: closest.distanceMeters }
          changed = true
        }
        const lastRebuildAt = routeRerouteCooldownRef.current[courierId] ?? 0
        if (closest.distanceMeters > ROUTE_DEVIATION_METERS && now - lastRebuildAt > ROUTE_REROUTE_COOLDOWN_MS) {
          toRebuild.push(courierId)
          routeRerouteCooldownRef.current[courierId] = now
        }
      }
      return changed ? next : prev
    })
    if (toRebuild.length > 0) void buildRoutes(toRebuild)
  }, [active, buildRoutes, liveCouriers, liveCouriersById])

  const syncLiveData = useCallback(async () => {
    if (!active || typeof document === 'undefined' || document.hidden || inFlightRef.current) return
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    inFlightRef.current = true
    setIsSyncing(true)
    try {
      const headers: HeadersInit = {}
      if (etagRef.current) headers['If-None-Match'] = etagRef.current
      const query = selectedDateISO ? `?date=${encodeURIComponent(selectedDateISO)}` : ''
      const res = await fetch(`/api/admin/live-map${query}`, { method: 'GET', cache: 'no-store', headers, signal: controller.signal })
      if (res.status === 304) { setLastSyncAt(new Date().toISOString()); return }
      if (!res.ok) return
      const nextEtag = res.headers.get('etag')
      if (nextEtag) etagRef.current = nextEtag
      const json = await res.json().catch(() => null)
      const data = json?.data ?? json
      const nextCouriers = normalizePoints(Array.isArray(data?.couriers) ? data.couriers.filter((i: any) => isFiniteCoord(i?.lat) && isFiniteCoord(i?.lng) && typeof i?.id === 'string').map((i: any) => ({ id: i.id, name: typeof i?.name === 'string' && i.name.trim() ? i.name : 'Courier', lat: i.lat, lng: i.lng })) : [])
      const nextClients = normalizePoints(Array.isArray(data?.clients) ? data.clients.filter((i: any) => isFiniteCoord(i?.lat) && isFiniteCoord(i?.lng) && typeof i?.id === 'string').map((i: any) => ({ id: i.id, name: typeof i?.name === 'string' && i.name.trim() ? i.name : 'Client', lat: i.lat, lng: i.lng })) : [])
      const nextOrders = normalizeOrders(Array.isArray(data?.orders) ? data.orders.filter((i: any) => isFiniteCoord(i?.lat) && isFiniteCoord(i?.lng) && typeof i?.id === 'string').map((i: any) => ({ id: i.id, orderNumber: typeof i?.orderNumber === 'number' ? i.orderNumber : 0, customerName: typeof i?.customerName === 'string' ? i.customerName : 'Client', status: typeof i?.status === 'string' ? i.status : 'NEW', deliveryTime: typeof i?.deliveryTime === 'string' ? i.deliveryTime : '', courierId: typeof i?.courierId === 'string' && i.courierId ? i.courierId : null, courierName: typeof i?.courierName === 'string' && i.courierName ? i.courierName : null, lat: Number(i.lat), lng: Number(i.lng) })) : [])
      const nextWarehouse = data?.warehouse && isFiniteCoord(data.warehouse?.lat) && isFiniteCoord(data.warehouse?.lng) ? ({ lat: Number(data.warehouse.lat), lng: Number(data.warehouse.lng) } as LatLng) : null
      setLiveCouriers((prev) => (equalPoints(prev, nextCouriers) ? prev : nextCouriers))
      setLiveClients((prev) => (equalPoints(prev, nextClients) ? prev : nextClients))
      setLiveOrders((prev) => (equalOrders(prev, nextOrders) ? prev : nextOrders))
      setLiveWarehouse((prev) => {
        if (!prev && !nextWarehouse) return prev
        if (prev && nextWarehouse && Math.abs(prev.lat - nextWarehouse.lat) < 0.0000005 && Math.abs(prev.lng - nextWarehouse.lng) < 0.0000005) return prev
        return nextWarehouse
      })
      setLastSyncAt(typeof data?.serverTime === 'string' ? data.serverTime : new Date().toISOString())
    } finally {
      inFlightRef.current = false
      setIsSyncing(false)
    }
  }, [active, selectedDateISO])

  useEffect(() => {
    if (!active) return
    void syncLiveData()
    const intervalId = setInterval(() => { void syncLiveData() }, 6000)
    const onVisibility = () => { if (!document.hidden) void syncLiveData() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      abortRef.current?.abort()
    }
  }, [active, syncLiveData])

  const setCourierDraftField = (courier: LiveMapPoint, field: keyof CourierDraft, value: string) => {
    setCourierDraftById((prev) => ({ ...prev, [courier.id]: { ...(prev[courier.id] || createCourierDraft(courier)), [field]: value } }))
  }
  const setOrderDraftField = (order: OrderPoint, field: keyof OrderDraft, value: string) => {
    setOrderDraftById((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || createOrderDraft(order)), [field]: value } }))
  }

  const saveCourier = useCallback(async (courierId: string) => {
    const draft = courierDraftById[courierId]
    if (!draft) return
    const lat = Number(draft.lat), lng = Number(draft.lng)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) { toast.error('Courier coordinates are invalid'); return }
    setSavingEntityId(`courier-${courierId}`)
    try {
      const response = await fetch('/api/admin/couriers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courierId, name: draft.name.trim(), latitude: lat, longitude: lng }) })
      const json = await response.json().catch(() => null)
      if (!response.ok) { const errMsg = typeof json?.error === 'object' ? (json.error?.message || 'Unable to update courier') : (json?.error || 'Unable to update courier'); throw new Error(errMsg) }
      const data = json?.data ?? json
      setLiveCouriers((prev) => normalizePoints(prev.map((c) => c.id === courierId ? { ...c, name: data?.name || draft.name.trim(), lat, lng } : c)))
      toast.success('Courier updated')
      onDataChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update courier')
    } finally {
      setSavingEntityId(null)
    }
  }, [courierDraftById, onDataChanged])

  const saveOrder = useCallback(async (orderId: string) => {
    const draft = orderDraftById[orderId]
    const currentOrder = liveOrders.find((o) => o.id === orderId)
    if (!draft || !currentOrder) return
    const lat = Number(draft.lat), lng = Number(draft.lng)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) { toast.error('Order coordinates are invalid'); return }
    setSavingEntityId(`order-${orderId}`)
    try {
      const detailsRes = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_details',
          deliveryAddress: draft.deliveryAddress.trim(),
          deliveryTime: draft.deliveryTime,
          courierId: draft.courierId || null,
          latitude: lat,
          longitude: lng,
        }),
      })
      const detailsData = await detailsRes.json().catch(() => null)
      if (!detailsRes.ok) throw new Error((detailsData && detailsData.error) || 'Unable to update order')
      if (draft.status && draft.status !== currentOrder.status) {
        const statusRes = await fetch('/api/admin/orders/bulk-update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: [orderId], updates: { orderStatus: draft.status } }),
        })
        const statusData = await statusRes.json().catch(() => null)
        if (!statusRes.ok) throw new Error((statusData && statusData.error) || 'Unable to update order status')
      }
      setLiveOrders((prev) => normalizeOrders(prev.map((o) => o.id === orderId ? {
        ...o,
        deliveryTime: draft.deliveryTime,
        courierId: draft.courierId || null,
        courierName: liveCouriersById.get(draft.courierId)?.name || null,
        status: draft.status,
        lat,
        lng,
      } : o)))
      toast.success('Order updated')
      onDataChanged?.()
      void syncLiveData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update order')
    } finally {
      setSavingEntityId(null)
    }
  }, [liveCouriersById, liveOrders, onDataChanged, orderDraftById, syncLiveData])

  const saveWarehouse = useCallback(async () => {
    const lat = Number(warehouseDraft.lat), lng = Number(warehouseDraft.lng)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) { toast.error('Warehouse coordinates are invalid'); return }
    setSavingEntityId('warehouse')
    try {
      const response = await fetch('/api/admin/warehouse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        const errMsg = json?.error?.message || json?.error || 'Unable to update warehouse'
        throw new Error(typeof errMsg === 'string' ? errMsg : 'Unable to update warehouse')
      }
      const nextPoint = { lat, lng }
      setLiveWarehouse(nextPoint)
      onWarehouseUpdated?.(nextPoint)
      onDataChanged?.()
      toast.success('Warehouse updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update warehouse')
    } finally {
      setSavingEntityId(null)
    }
  }, [onDataChanged, onWarehouseUpdated, warehouseDraft.lat, warehouseDraft.lng])

  const courierIcons = useMemo(() => {
    const iconMap = new Map<string, L.DivIcon>()
    for (const courier of liveCouriers) {
      const state = routeStateByCourier[courier.id]
      iconMap.set(courier.id, createCourierIcon(getCourierColor(courier.id), courier.name.slice(0, 2), !!state && state.deviationMeters > ROUTE_DEVIATION_METERS))
    }
    return iconMap
  }, [liveCouriers, routeStateByCourier])

  const visiblePoints = useMemo<Array<[number, number]>>(() => {
    const next: Array<[number, number]> = []
    if (showCouriers) liveCouriers.forEach((p) => next.push([p.lat, p.lng]))
    if (showClients) liveClients.forEach((p) => next.push([p.lat, p.lng]))
    if (showOrders) liveOrders.forEach((p) => next.push([p.lat, p.lng]))
    if (showWarehouse && liveWarehouse) next.push([liveWarehouse.lat, liveWarehouse.lng])
    return next
  }, [liveClients, liveCouriers, liveOrders, liveWarehouse, showClients, showCouriers, showOrders, showWarehouse])

  const mapCenter = useMemo<[number, number]>(() => (visiblePoints.length > 0 ? visiblePoints[0] : [41.2995, 69.2401]), [visiblePoints])
  useEffect(() => {
    if (didAutofitRef.current || visiblePoints.length === 0) return
    didAutofitRef.current = true
    setFitTick((v) => v + 1)
  }, [visiblePoints.length])

  const activeRouteCount = useMemo(() => Object.values(routeStateByCourier).filter((s) => s.visiblePolyline.length >= 2).length, [routeStateByCourier])
  const offRouteCount = useMemo(() => Object.values(routeStateByCourier).filter((s) => s.deviationMeters > ROUTE_DEVIATION_METERS).length, [routeStateByCourier])

  return (
 <Card className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.24),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.20),transparent_38%),linear-gradient(120deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] p-3 shadow-[0_28px_64px_-30px_rgba(2,6,23,0.55)] sm:p-4">
      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-900 p-1.5 text-white shadow-lg"><Navigation className="h-4 w-4" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Realtime Ops</p>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Smart live dispatch map</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setFitTick((v) => v + 1)}>
              <LocateFixed className="mr-1.5 h-3.5 w-3.5" />Center
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => void syncLiveData()} disabled={isSyncing}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />Sync
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full bg-slate-900/90 px-2.5 py-1 text-[11px] text-white">Couriers: {liveCouriers.length}</Badge>
          <Badge variant="secondary" className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] text-cyan-800">Clients: {liveClients.length}</Badge>
          <Badge variant="secondary" className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-800">Orders: {liveOrders.length}</Badge>
          <Badge variant="secondary" className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] text-violet-800">Routes: {activeRouteCount}</Badge>
          {offRouteCount > 0 && <Badge variant="destructive" className="rounded-full px-2.5 py-1 text-[11px]">Off route: {offRouteCount}</Badge>}
          {lastSyncAt && <span className="text-[11px] text-muted-foreground">Updated {new Date(lastSyncAt).toLocaleTimeString()}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant={showCouriers ? 'default' : 'outline'} size="sm" onClick={() => setShowCouriers((v) => !v)} className="h-8 rounded-full px-3 text-xs"><Navigation className="mr-1.5 h-3.5 w-3.5" />Couriers</Button>
          <Button type="button" variant={showOrders ? 'default' : 'outline'} size="sm" onClick={() => setShowOrders((v) => !v)} className="h-8 rounded-full px-3 text-xs">Orders</Button>
          <Button type="button" variant={showWarehouse ? 'default' : 'outline'} size="sm" onClick={() => setShowWarehouse((v) => !v)} className="h-8 rounded-full px-3 text-xs"><Building2 className="mr-1.5 h-3.5 w-3.5" />Warehouse</Button>
          <Button type="button" variant={showClients ? 'default' : 'outline'} size="sm" onClick={() => setShowClients((v) => !v)} className="h-8 rounded-full px-3 text-xs"><Users className="mr-1.5 h-3.5 w-3.5" />Clients</Button>
          <Button type="button" variant={showRoutes ? 'default' : 'outline'} size="sm" onClick={() => setShowRoutes((v) => !v)} className="h-8 rounded-full px-3 text-xs"><Route className="mr-1.5 h-3.5 w-3.5" />Routes</Button>
        </div>

 <div className="h-[360px] overflow-hidden rounded-2xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_30px_45px_-35px_rgba(15,23,42,0.9)] sm:h-[470px]">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl preferCanvas>
            <TileLayer attribution='&copy; OpenStreetMap, &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" updateWhenIdle updateWhenZooming={false} keepBuffer={4} />
            <TileLayer attribution='&copy; OpenTopoMap' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" opacity={0.2} updateWhenIdle updateWhenZooming={false} keepBuffer={3} />

            {showRoutes && Object.values(routeStateByCourier).filter((s) => s.visiblePolyline.length >= 2).map((s) => (
              <Fragment key={`route-${s.courierId}`}>
                <Polyline positions={s.visiblePolyline.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: s.color, weight: 10, opacity: 0.14, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline positions={s.visiblePolyline.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: s.color, weight: 5, opacity: 0.9, dashArray: '2 9', lineCap: 'round', lineJoin: 'round' }} />
              </Fragment>
            ))}

            {showWarehouse && liveWarehouse && (
              <Marker position={[liveWarehouse.lat, liveWarehouse.lng]} icon={createWarehouseIcon()}>
                <Tooltip direction="top" offset={[0, -16]} opacity={1} sticky>
                  <div className="space-y-0.5"><div className="text-[10px] uppercase tracking-[0.1em] text-amber-600">Warehouse</div><div className="text-xs font-semibold">{liveWarehouse.lat.toFixed(5)}, {liveWarehouse.lng.toFixed(5)}</div></div>
                </Tooltip>
                <Popup minWidth={230}>
                  <div className="space-y-2 text-xs">
                    <label className="block">Lat<Input className="mt-1 h-8" value={warehouseDraft.lat} onChange={(e) => setWarehouseDraft((p) => ({ ...p, lat: e.target.value }))} /></label>
                    <label className="block">Lng<Input className="mt-1 h-8" value={warehouseDraft.lng} onChange={(e) => setWarehouseDraft((p) => ({ ...p, lng: e.target.value }))} /></label>
                    <Button type="button" className="h-8 w-full" onClick={() => void saveWarehouse()} disabled={savingEntityId === 'warehouse'}>
                      {savingEntityId === 'warehouse' ? 'Saving...' : 'Save warehouse'}
                    </Button>
                  </div>
                </Popup>
              </Marker>
            )}

            {showClients && liveClients.map((client) => (
              <CircleMarker key={`client-${client.id}`} center={[client.lat, client.lng]} radius={4} pathOptions={{ color: '#0f172a', weight: 1, fillColor: '#22d3ee', fillOpacity: 0.75 }}>
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky><div><div className="text-[10px] uppercase tracking-[0.1em] text-cyan-700">Client</div><div className="text-xs font-semibold">{client.name}</div></div></Tooltip>
              </CircleMarker>
            ))}

            {showOrders && liveOrders.map((order) => {
              const draft = orderDraftById[order.id] || createOrderDraft(order)
              return (
                <CircleMarker key={`order-${order.id}`} center={[order.lat, order.lng]} radius={6} pathOptions={{ color: '#7c2d12', weight: 1, fillColor: '#f59e0b', fillOpacity: 0.88 }} eventHandlers={{ click: () => setOrderDraftById((p) => ({ ...p, [order.id]: draft })) }}>
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95} sticky><div><div className="text-[10px] uppercase tracking-[0.1em] text-amber-700">Order #{order.orderNumber}</div><div className="text-xs font-semibold">{order.customerName}</div><div className="text-[11px] text-slate-600">{order.status}</div></div></Tooltip>
                  <Popup minWidth={270}>
                    <div className="space-y-2 text-xs">
                      <label className="block">
                        Status
                        <Select value={draft.status} onValueChange={(value) => setOrderDraftField(order, 'status', value)}>
                          <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="block">
                        Courier
                        <Select value={draft.courierId || '__none__'} onValueChange={(value) => setOrderDraftField(order, 'courierId', value === '__none__' ? '' : value)}>
                          <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned</SelectItem>
                            {liveCouriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="block">Time<Input className="mt-1 h-8" value={draft.deliveryTime} onChange={(e) => setOrderDraftField(order, 'deliveryTime', e.target.value)} /></label>
                      <label className="block">Address<Input className="mt-1 h-8" value={draft.deliveryAddress} onChange={(e) => setOrderDraftField(order, 'deliveryAddress', e.target.value)} /></label>
                      <div className="grid grid-cols-2 gap-2">
                        <label>Lat<Input className="mt-1 h-8" value={draft.lat} onChange={(e) => setOrderDraftField(order, 'lat', e.target.value)} /></label>
                        <label>Lng<Input className="mt-1 h-8" value={draft.lng} onChange={(e) => setOrderDraftField(order, 'lng', e.target.value)} /></label>
                      </div>
                      <Button type="button" className="h-8 w-full" onClick={() => void saveOrder(order.id)} disabled={savingEntityId === `order-${order.id}`}>
                        {savingEntityId === `order-${order.id}` ? 'Saving...' : 'Save order'}
                      </Button>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

            {showCouriers && liveCouriers.map((courier) => {
              const state = routeStateByCourier[courier.id]
              const offRoute = !!state && state.deviationMeters > ROUTE_DEVIATION_METERS
              const draft = courierDraftById[courier.id] || createCourierDraft(courier)
              return (
                <Marker key={`courier-${courier.id}`} position={[courier.lat, courier.lng]} icon={courierIcons.get(courier.id)} eventHandlers={{ click: () => setCourierDraftById((p) => ({ ...p, [courier.id]: draft })) }}>
                  <Tooltip direction="top" offset={[0, -16]} opacity={0.97} sticky><div><div className="text-[10px] uppercase tracking-[0.1em] text-slate-600">Courier</div><div className="text-xs font-semibold">{courier.name}</div>{state && <div className={`text-[11px] ${offRoute ? 'text-rose-600' : 'text-emerald-600'}`}>{offRoute ? `Off route ${Math.round(state.deviationMeters)}m` : 'On route'}</div>}</div></Tooltip>
                  <Popup minWidth={250}>
                    <div className="space-y-2 text-xs">
                      <label className="block">Name<Input className="mt-1 h-8" value={draft.name} onChange={(e) => setCourierDraftField(courier, 'name', e.target.value)} /></label>
                      <div className="grid grid-cols-2 gap-2">
                        <label>Lat<Input className="mt-1 h-8" value={draft.lat} onChange={(e) => setCourierDraftField(courier, 'lat', e.target.value)} /></label>
                        <label>Lng<Input className="mt-1 h-8" value={draft.lng} onChange={(e) => setCourierDraftField(courier, 'lng', e.target.value)} /></label>
                      </div>
 {state && <div className={`rounded px-2 py-1 text-[11px] ${offRoute ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{offRoute ? `Route deviation: ${Math.round(state.deviationMeters)} m` : 'Courier is within planned route'}</div>}
                      <Button type="button" className="h-8 w-full" onClick={() => void saveCourier(courier.id)} disabled={savingEntityId === `courier-${courier.id}`}>
                        {savingEntityId === `courier-${courier.id}` ? 'Saving...' : 'Save courier'}
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            <FitToVisiblePoints points={visiblePoints} fitTick={fitTick} />
          </MapContainer>
        </div>
      </div>
    </Card>
  )
}
