'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Admin, Order } from '@/components/admin/dashboard/types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  expandShortMapsUrl,
  extractAnyUrl,
  extractCoordsFromText,
  extractShortGoogleMapsUrl,
  isGoogleMapsLikeUrl,
  isShortGoogleMapsUrl,
  type LatLng,
} from '@/modules/shared/geo'
import { getCourierColor } from '@/lib/courier-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { GripVertical, Loader2, Play, Route, Save, Users } from 'lucide-react'

const DispatchLeafletMap = dynamic(() => import('./DispatchLeafletMap'), {
  ssr: false,
  loading: () => (
 <div className="flex h-full w-full animate-pulse items-center justify-center rounded-lg bg-muted/30 text-muted-foreground">
      Loading map…
    </div>
  ),
})

type ContainerId = string

const ROUTE_REFRESH_COOLDOWN_MS = 60_000

function haversineDistance(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

function optimizeNearestNeighbor(startPoint: LatLng, locations: Array<{ id: string; coords: LatLng }>) {
  if (locations.length <= 1) return locations.map((l) => l.id)

  const visited = new Set<string>()
  const route: string[] = []
  let current = startPoint

  while (visited.size < locations.length) {
    let bestId: string | null = null
    let bestDist = Infinity

    for (const loc of locations) {
      if (visited.has(loc.id)) continue
      const d = haversineDistance(current, loc.coords)
      if (d < bestDist) {
        bestDist = d
        bestId = loc.id
      }
    }

    if (!bestId) break
    visited.add(bestId)
    route.push(bestId)
    const picked = locations.find((l) => l.id === bestId)
    if (picked) current = picked.coords
  }

  return route
}

function findContainerForId(containers: Record<ContainerId, string[]>, id: string): ContainerId | null {
  if (id in containers) return id
  for (const key of Object.keys(containers)) {
    if (containers[key].includes(id)) return key
  }
  return null
}

function renumberInOrder(
  orderIds: string[],
  orderNumberById: Record<string, number | undefined>
): Record<string, number | undefined> {
  const numbers = orderIds.map((id) => orderNumberById[id]).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b)
  const next = { ...orderNumberById }
  for (let i = 0; i < orderIds.length; i++) {
    const id = orderIds[i]
    const n = numbers[i]
    if (typeof n === 'number') next[id] = n
  }
  return next
}

function snapCoord(value: number) {
  // ~11m precision to avoid route-key churn from tiny GPS jitter.
  return Number.isFinite(value) ? value.toFixed(4) : 'NaN'
}

function makeRouteSignature(containerId: string, orderedOrderIds: string[]) {
  // Exact "priority list" signature: same courier container + same ordered order ids.
  return `${containerId}|${orderedOrderIds.join(',')}`
}

function makeRouteKey(signature: string, startPoint: LatLng | null, stops: Array<{ orderId: string; lat: number; lng: number }>) {
  const start = startPoint ? `${snapCoord(startPoint.lat)},${snapCoord(startPoint.lng)}` : 'none'
  const stopSig = stops.map((s) => `${s.orderId}@${snapCoord(s.lat)},${snapCoord(s.lng)}`).join(';')
  return `${signature}|S:${start}|T:${stopSig}`
}

function SortableOrderItem({
  order,
  color,
  courierName,
  number,
  coords,
  onNumberChange,
}: {
  order: Order
  color: string
  courierName: string
  number: number
  coords: LatLng | null | undefined
  onNumberChange: (next: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
 className={`flex items-start gap-2 rounded-md bg-background p-2 ${isDragging ? 'opacity-70' : ''}`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-1 h-7 w-7 cursor-grab text-muted-foreground/70 hover:text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <div className="font-semibold text-sm truncate">#{number}</div>
          {!coords && <Badge variant="outline" className="text-[10px]">No coords</Badge>}
        </div>
        <div className="text-xs truncate">{order.customer?.name || order.customerName || '-'}</div>
        <div className="text-[11px] text-muted-foreground truncate">{order.deliveryAddress}</div>
        <div className="mt-1 text-[10px] text-muted-foreground truncate">{courierName}</div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <Input
          type="number"
          value={number}
          onChange={(e) => onNumberChange(parseInt(e.target.value, 10))}
          className="h-8 w-24 text-sm"
        />
      </div>
    </div>
  )
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-2 ring-primary/40 rounded-lg' : undefined}>
      {children}
    </div>
  )
}

export function DispatchMapPanel({
  open,
  onOpenChange,
  orders,
  couriers,
  selectedDateLabel,
  selectedDateISO,
  warehousePoint,
  autoSortOnOpen = true,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  couriers: Admin[]
  selectedDateLabel: string
  selectedDateISO?: string
  warehousePoint: LatLng | null
  autoSortOnOpen?: boolean
  onSaved: () => void
}) {
  const { language } = useLanguage()
  const safeOrders = orders
  const safeCouriers = couriers

  const UNASSIGNED = 'unassigned'
  const [containers, setContainers] = useState<Record<ContainerId, string[]>>({})
  const [orderNumberById, setOrderNumberById] = useState<Record<string, number>>({})
  const [coordsById, setCoordsById] = useState<Record<string, LatLng | null | undefined>>({})
  const [routeStatsByContainer, setRouteStatsByContainer] = useState<Record<string, { durationSec: number | null; source: string }>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isDayActiveOverride, setIsDayActiveOverride] = useState<boolean | null>(null)
  const [search, setSearch] = useState('')
  const [roadPolylineByContainer, setRoadPolylineByContainer] = useState<Record<string, LatLng[]>>({})

  const expandedCache = useRef(new Map<string, string>())
  const dirtyRouteContainersRef = useRef<Set<string>>(new Set())
  const dirtyRouteVersionByIdRef = useRef<Record<string, number>>({})
  const routeRequestSeqRef = useRef(0)
  const deferredRoadRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const routeCacheRef = useRef(
    new Map<
      string,
      {
        polyline: LatLng[]
        durationSec: number | null
        source: 'ors' | 'fallback' | 'none'
        fetchedAt: number
      }
    >()
  )
  const bestOrsRouteKeyBySignatureRef = useRef(new Map<string, string>())
  const lastFetchAtByContainerRef = useRef<Record<string, number>>({})
  const lastSignatureByContainerRef = useRef<Record<string, string>>({})
  const routeStatsByContainerRef = useRef(routeStatsByContainer)
  const initKeyRef = useRef<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const markContainersDirty = useCallback((containerIds: string[]) => {
    for (const id of containerIds) {
      dirtyRouteContainersRef.current.add(id)
      dirtyRouteVersionByIdRef.current[id] = (dirtyRouteVersionByIdRef.current[id] ?? 0) + 1
    }
  }, [])

  useEffect(() => {
    routeStatsByContainerRef.current = routeStatsByContainer
  }, [routeStatsByContainer])

  useEffect(() => {
    if (open) return
    initKeyRef.current = null
    if (deferredRoadRefreshTimerRef.current) clearTimeout(deferredRoadRefreshTimerRef.current)
    deferredRoadRefreshTimerRef.current = null
  }, [open])

  const uiText = useMemo(() => {
    if (language === 'uz') {
      return {
        title: (dateLabel: string) => `Xarita / Marshrutlar — ${dateLabel}`,
        statusActive: 'Faol',
        statusPlanned: 'Reja',
        description: 'Buyurtmalarni kuryerlar orasida tortib o‘tkazing, tartib va raqamlarni o‘zgartiring. Buyurtma rangi = kuryer rangi.',
        searchPlaceholder: 'Qidirish (raqam, mijoz, manzil)…',
        couriers: 'Kuryerlar',
        unassigned: 'Biriktirilmagan',
        courierFallback: 'Kuryer',
        noOrders: 'Buyurtmalar yo‘q',
        dragging: 'Sudralmoqda',
        close: 'Yopish',
        save: 'Saqlash',
        saving: 'Saqlanmoqda…',
        start: 'Boshlash',
        starting: 'Boshlanmoqda…',
      }
    }

    if (language === 'ru') {
      return {
        title: (dateLabel: string) => `Карта / Маршруты — ${dateLabel}`,
        statusActive: 'Активный',
        statusPlanned: 'План',
        description: 'Перетащите заказы между курьерами, изменяйте порядок и номера. Цвет заказа = цвет курьера.',
        searchPlaceholder: 'Поиск (номер, клиент, адрес)…',
        couriers: 'Курьеры',
        unassigned: 'Без курьера',
        courierFallback: 'Курьер',
        noOrders: 'Нет заказов',
        dragging: 'Перетаскивание',
        close: 'Закрыть',
        save: 'Сохранить',
        saving: 'Сохранение…',
        start: 'Начать',
        starting: 'Запуск…',
      }
    }

    return {
      title: (dateLabel: string) => `Map / Routes — ${dateLabel}`,
      statusActive: 'Active',
      statusPlanned: 'Planned',
      description: 'Drag orders between couriers, adjust ordering and numbers. Order color = courier color.',
      searchPlaceholder: 'Search (number, client, address)…',
      couriers: 'Couriers',
      unassigned: 'Unassigned',
      courierFallback: 'Courier',
      noOrders: 'No orders',
      dragging: 'Dragging',
      close: 'Close',
      save: 'Save',
      saving: 'Saving…',
      start: 'Start',
      starting: 'Starting…',
    }
  }, [language])

  const orderById = useMemo(() => new Map(safeOrders.map((o) => [o.id, o])), [safeOrders])

  const courierNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of safeCouriers) m.set(c.id, c.name)
    return m
  }, [safeCouriers])

  const courierStartById = useMemo(() => {
    const m = new Map<string, LatLng>()
    for (const c of safeCouriers) {
      if (typeof c.latitude === 'number' && typeof c.longitude === 'number') {
        m.set(c.id, { lat: c.latitude, lng: c.longitude })
      }
    }
    return m
  }, [safeCouriers])

  const isDayActiveDerived = useMemo(() => {
    if (safeOrders.length === 0) return false
    if (!selectedDateISO) return false
    const todayISO = new Date().toISOString().split('T')[0]
    if (selectedDateISO !== todayISO) return false
    return safeOrders.some((o) => {
      const status = String(o.orderStatus ?? '')
      const hasCourier = !!o.courierId
      return hasCourier && status !== 'NEW' && status !== 'IN_PROCESS'
    })
  }, [safeOrders, selectedDateISO])

  const isDayActive = isDayActiveOverride ?? isDayActiveDerived

  useEffect(() => {
    if (open) {
      setIsDayActiveOverride(null)
    }
  }, [open])

  const isTodaySelected = useMemo(() => {
    if (!selectedDateISO) return false
    const todayISO = new Date().toISOString().split('T')[0]
    return selectedDateISO === todayISO
  }, [selectedDateISO])

  const allContainerIds = useMemo<ContainerId[]>(() => {
    const base = safeCouriers.map((c) => c.id)
    const ids = new Set<string>([...base, UNASSIGNED])
    // include any courierId referenced by orders but missing from couriers list
    for (const o of safeOrders) {
      if (o.courierId) ids.add(o.courierId)
    }
    return Array.from(ids)
  }, [safeCouriers, safeOrders])

  // Initialize container state + numbers when opening
  useEffect(() => {
    if (!open) return
    const initKey = selectedDateISO ?? '__no_date__'
    if (initKeyRef.current === initKey) return
    initKeyRef.current = initKey
    const grouped: Record<ContainerId, string[]> = {}
    for (const id of allContainerIds) grouped[id] = []

    const numbers: Record<string, number> = {}
    for (const o of safeOrders) {
      numbers[o.id] = o.orderNumber
      const containerId = o.courierId || UNASSIGNED
      if (!grouped[containerId]) grouped[containerId] = []
      grouped[containerId].push(o.id)
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (numbers[a] ?? 0) - (numbers[b] ?? 0))
    }

    setContainers(grouped)
    setOrderNumberById(numbers)
    setRoadPolylineByContainer({})
    setRouteStatsByContainer({})
    markContainersDirty(allContainerIds)
    setSearch('')
  }, [allContainerIds, markContainersDirty, open, safeOrders, selectedDateISO])

  // Resolve coordinates for orders
  useEffect(() => {
    if (!open) return
    let cancelled = false

    const coerceLatLng = (latRaw: unknown, lngRaw: unknown): LatLng | null => {
      const lat =
        typeof latRaw === 'number' ? latRaw :
          typeof latRaw === 'string' ? Number(latRaw) :
            NaN
      const lng =
        typeof lngRaw === 'number' ? lngRaw :
          typeof lngRaw === 'string' ? Number(lngRaw) :
            NaN

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      if (lat < -90 || lat > 90) return null
      if (lng < -180 || lng > 180) return null
      return { lat, lng }
    }

    const base: Record<string, LatLng | null | undefined> = {}
    const toExpand: Array<{ id: string; url: string }> = []

    for (const o of safeOrders) {
      const saved = coerceLatLng(o.latitude, o.longitude)
      if (saved) {
        base[o.id] = saved
        continue
      }

      const raw = o.deliveryAddress || ''
      const parsed = extractCoordsFromText(raw)
      if (parsed) {
        base[o.id] = parsed
        continue
      }

      const shortUrl = isShortGoogleMapsUrl(raw) ? raw : extractShortGoogleMapsUrl(raw)
      if (shortUrl) {
        base[o.id] = null
        toExpand.push({ id: o.id, url: shortUrl })
        continue
      }

      const anyUrl = extractAnyUrl(raw)
      if (anyUrl && isGoogleMapsLikeUrl(anyUrl)) {
        const fromUrl = extractCoordsFromText(anyUrl)
        if (fromUrl) {
          base[o.id] = fromUrl
        } else {
          base[o.id] = null
          toExpand.push({ id: o.id, url: anyUrl })
        }
        continue
      }

      base[o.id] = null
    }

    setCoordsById(base)

    ;(async () => {
      for (const item of toExpand) {
        if (cancelled) return
        try {
          const cached = expandedCache.current.get(item.url)
          const expanded = cached ?? (await expandShortMapsUrl(item.url))

          if (expanded) expandedCache.current.set(item.url, expanded)
          const coords = (expanded ? extractCoordsFromText(expanded) : null) ?? extractCoordsFromText(item.url)
          if (!cancelled) {
            setCoordsById((prev) => ({ ...prev, [item.id]: coords }))
          }
        } catch {
          if (!cancelled) setCoordsById((prev) => ({ ...prev, [item.id]: null }))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, safeOrders])

  const filteredOrderIds = useMemo(() => {
    if (!search.trim()) return null
    const q = search.trim().toLowerCase()
    const result = new Set<string>()
    for (const o of safeOrders) {
      const hay = `${o.orderNumber} ${o.customer?.name || ''} ${o.customerName || ''} ${o.deliveryAddress || ''}`.toLowerCase()
      if (hay.includes(q)) result.add(o.id)
    }
    return result
  }, [safeOrders, search])

  const buildMapData = useMemo(() => {
    const markers: Array<{ id: string; position: LatLng; color: string; label: string; popup?: string }> = []
    const polylines: Array<{ id: string; color: string; positions: LatLng[] }> = []

    for (const containerId of Object.keys(containers)) {
      if (containerId === UNASSIGNED) continue
      const ids = containers[containerId] || []
      const color = getCourierColor(containerId)
      const courierName = courierNameById.get(containerId) || 'Курьер'
      const routeStart = courierStartById.get(containerId) ?? warehousePoint ?? null
      const roadPolyline = roadPolylineByContainer[containerId]

      const linePositions: LatLng[] = []
      if (routeStart) {
        linePositions.push(routeStart)
        markers.push({
          id: `courier-${containerId}`,
          position: routeStart,
          color,
          label: 'C',
          popup: `${courierName} • start`,
        })
      }

      for (const id of ids) {
        const coords = coordsById[id]
        const n = orderNumberById[id]
        const o = orderById.get(id)
        if (!o) continue
        if (coords) {
          markers.push({
            id,
            position: coords,
            color,
            label: String(n ?? ''),
            popup: `${o.customer?.name || o.customerName || 'Клиент'} • #${n ?? ''}`,
          })
          linePositions.push(coords)
        }
      }

      if (Array.isArray(roadPolyline) && roadPolyline.length >= 2) {
        polylines.push({ id: containerId, color, positions: roadPolyline })
      } else if (linePositions.length >= 2) {
        polylines.push({ id: containerId, color, positions: linePositions })
      }
    }

    // Unassigned markers (gray, no polyline)
    const unassignedIds = containers[UNASSIGNED] || []
    const unassignedLine: LatLng[] = []
    if (warehousePoint) unassignedLine.push(warehousePoint)
    for (const id of unassignedIds) {
      const coords = coordsById[id]
      const n = orderNumberById[id]
      const o = orderById.get(id)
      if (!o) continue
      if (coords) {
        unassignedLine.push(coords)
        markers.push({
          id,
          position: coords,
          color: '#94A3B8',
          label: String(n ?? ''),
          popup: `${o.customer?.name || o.customerName || 'Клиент'} • #${n ?? ''} • Без курьера`,
        })
      }
    }
    const unassignedRoadPolyline = roadPolylineByContainer[UNASSIGNED]
    if (Array.isArray(unassignedRoadPolyline) && unassignedRoadPolyline.length >= 2) {
      polylines.push({ id: UNASSIGNED, color: '#94A3B8', positions: unassignedRoadPolyline })
    } else if (unassignedLine.length >= 2) {
      polylines.push({ id: 'unassigned', color: '#94A3B8', positions: unassignedLine })
    }

    return { markers, polylines }
  }, [containers, coordsById, courierNameById, courierStartById, orderById, orderNumberById, roadPolylineByContainer, warehousePoint])

  const lastStableMapDataRef = useRef<{ markers: typeof buildMapData.markers; polylines: typeof buildMapData.polylines } | null>(null)
  const mapDataForRender = useMemo(() => {
    if (activeId && lastStableMapDataRef.current) return lastStableMapDataRef.current
    lastStableMapDataRef.current = buildMapData
    return buildMapData
  }, [activeId, buildMapData])

  const refreshRoadRoutes = useCallback(async (containerIds: string[]) => {
    const now = Date.now()
    const versionsAtStart: Record<string, number> = {}
    for (const id of containerIds) versionsAtStart[id] = dirtyRouteVersionByIdRef.current[id] ?? 0

    const polylineFromCache: Record<string, LatLng[]> = {}
    const statsFromCache: Record<string, { durationSec: number | null; source: string }> = {}
    const appliedFromCache = new Set<string>()

    const deferred: string[] = []
    let minDeferredMs: number | null = null

    const routesToFetch: Array<{ containerId: string; startPoint: LatLng | null; stops: Array<{ orderId: string; lat: number; lng: number }> }> = []
    const routeKeyByContainer = new Map<string, string>()
    const signatureByContainer = new Map<string, string>()

    for (const containerId of containerIds) {
      const ids = containers[containerId] || []
      const stops = ids
        .map((id) => {
          const coords = coordsById[id]
          if (!coords) return null
          return { orderId: id, lat: coords.lat, lng: coords.lng }
        })
        .filter((s): s is { orderId: string; lat: number; lng: number } => s !== null)

      const startPoint = courierStartById.get(containerId) ?? warehousePoint ?? null
      const pointCount = (startPoint ? 1 : 0) + stops.length
      if (pointCount < 2) {
        // Nothing to request; just clear dirty if it didn't change again.
        const current = dirtyRouteVersionByIdRef.current[containerId] ?? 0
        if (current === (versionsAtStart[containerId] ?? 0)) dirtyRouteContainersRef.current.delete(containerId)
        continue
      }

      const signature = makeRouteSignature(containerId, ids)
      const routeKey = makeRouteKey(signature, startPoint, stops)
      signatureByContainer.set(containerId, signature)
      routeKeyByContainer.set(containerId, routeKey)

      const cached =
        routeCacheRef.current.get(routeKey) ??
        (() => {
          const bestOrsKey = bestOrsRouteKeyBySignatureRef.current.get(signature)
          return bestOrsKey ? routeCacheRef.current.get(bestOrsKey) ?? null : null
        })()

      if (cached && Array.isArray(cached.polyline) && cached.polyline.length >= 2) {
        polylineFromCache[containerId] = cached.polyline
        statsFromCache[containerId] = { durationSec: cached.durationSec, source: cached.source }
        lastSignatureByContainerRef.current[containerId] = signature
        lastFetchAtByContainerRef.current[containerId] = cached.fetchedAt
        appliedFromCache.add(containerId)
        continue
      }

      const lastSig = lastSignatureByContainerRef.current[containerId]
      const sigChanged = typeof lastSig === 'string' && lastSig.length > 0 && lastSig !== signature
      const lastFetchAt = lastFetchAtByContainerRef.current[containerId] ?? 0
      const nextAllowedAt = sigChanged ? now : lastFetchAt + ROUTE_REFRESH_COOLDOWN_MS

      if (now < nextAllowedAt) {
        const waitMs = nextAllowedAt - now
        deferred.push(containerId)
        minDeferredMs = minDeferredMs === null ? waitMs : Math.min(minDeferredMs, waitMs)
        continue
      }

      // Mark as "fetched recently" immediately to avoid spamming while in-flight.
      lastSignatureByContainerRef.current[containerId] = signature
      lastFetchAtByContainerRef.current[containerId] = now
      routesToFetch.push({ containerId, startPoint, stops })
    }

    if (Object.keys(polylineFromCache).length > 0) {
      setRoadPolylineByContainer((prev) => ({ ...prev, ...polylineFromCache }))
      setRouteStatsByContainer((prev) => ({ ...prev, ...statsFromCache }))

      for (const id of appliedFromCache) {
        const current = dirtyRouteVersionByIdRef.current[id] ?? 0
        if (current === (versionsAtStart[id] ?? 0)) dirtyRouteContainersRef.current.delete(id)
      }
    }

    if (routesToFetch.length === 0) {
      if (deferred.length > 0 && minDeferredMs !== null && open) {
        if (deferredRoadRefreshTimerRef.current) clearTimeout(deferredRoadRefreshTimerRef.current)
        deferredRoadRefreshTimerRef.current = setTimeout(() => {
          void refreshRoadRoutes(Array.from(new Set(Array.from(dirtyRouteContainersRef.current))))
        }, Math.max(250, minDeferredMs))
      }
      return
    }

    const seq = ++routeRequestSeqRef.current
    try {
      const res = await fetch('/api/admin/dispatch/ors-polyline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: routesToFetch }),
      })
      if (!res.ok) return

      const data: unknown = await res.json().catch(() => null)
      const rawRoutes =
        data &&
        typeof data === 'object' &&
        Array.isArray((data as { routes?: unknown }).routes)
          ? (data as { routes: unknown[] }).routes
          : []

      if (seq !== routeRequestSeqRef.current) return

      const polylineNext: Record<string, LatLng[]> = {}
      const statsNext: Record<string, { durationSec: number | null; source: string }> = {}

      for (const raw of rawRoutes) {
        if (!raw || typeof raw !== 'object') continue
        const r = raw as Record<string, unknown>
        const containerId = typeof r.containerId === 'string' ? r.containerId : ''
        if (!containerId) continue

        const polyline = Array.isArray(r.polyline)
          ? r.polyline
            .map((p) => {
              if (!p || typeof p !== 'object') return null
              const coord = p as Record<string, unknown>
              const lat = Number(coord.lat)
              const lng = Number(coord.lng)
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
              return { lat, lng }
            })
            .filter((p): p is LatLng => p !== null)
          : []

        const durationSecRaw = r.durationSec
        const durationSec = typeof durationSecRaw === 'number' && Number.isFinite(durationSecRaw) ? durationSecRaw : null
        const source = typeof r.source === 'string' ? r.source : 'unknown'

        const signature = signatureByContainer.get(containerId) ?? ''
        const routeKey = routeKeyByContainer.get(containerId) ?? ''
        if (signature && routeKey) {
          const cacheSource = source === 'ors' || source === 'fallback' || source === 'none' ? source : 'fallback'
          routeCacheRef.current.set(routeKey, { polyline, durationSec, source: cacheSource, fetchedAt: now })
          if (cacheSource === 'ors') bestOrsRouteKeyBySignatureRef.current.set(signature, routeKey)
        }

        const existingSource = routeStatsByContainerRef.current[containerId]?.source
        const hasOrsForSignature = signature ? bestOrsRouteKeyBySignatureRef.current.has(signature) : false
        if (source === 'fallback' && (existingSource === 'ors' || hasOrsForSignature)) {
          // Keep the best ORS line we already have (avoid flicker back to straight lines).
          continue
        }

        if (polyline.length >= 2) polylineNext[containerId] = polyline
        statsNext[containerId] = { durationSec, source }
      }

      setRoadPolylineByContainer((prev) => ({ ...prev, ...polylineNext }))
      setRouteStatsByContainer((prev) => ({ ...prev, ...statsNext }))
    } finally {
      for (const id of containerIds) {
        if (deferred.includes(id)) continue
        const current = dirtyRouteVersionByIdRef.current[id] ?? 0
        if (current === (versionsAtStart[id] ?? 0)) dirtyRouteContainersRef.current.delete(id)
      }

      if (deferred.length > 0 && minDeferredMs !== null && open) {
        if (deferredRoadRefreshTimerRef.current) clearTimeout(deferredRoadRefreshTimerRef.current)
        deferredRoadRefreshTimerRef.current = setTimeout(() => {
          void refreshRoadRoutes(Array.from(new Set(Array.from(dirtyRouteContainersRef.current))))
        }, Math.max(250, minDeferredMs))
      }
    }
  }, [containers, coordsById, courierStartById, open, warehousePoint])

  useEffect(() => {
    if (!open) return
    if (activeId) return

    const dirty = Array.from(dirtyRouteContainersRef.current)
    if (dirty.length === 0) return

    const t = setTimeout(() => {
      void refreshRoadRoutes(dirty)
    }, 500)

    return () => clearTimeout(t)
  }, [activeId, open, refreshRoadRoutes])

  const applyAutoSortAll = useCallback(async () => {
    const hasCourierStart = safeCouriers.some((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
    if (!warehousePoint && !hasCourierStart) {
      toast.error('Set warehouse coordinates or enable courier geolocation')
      return
    }

    const currentContainers = { ...containers }
    const nextContainers = { ...currentContainers }
    const withoutCoordsByContainer: Record<string, string[]> = {}
    const withCoordsByContainer: Record<string, Array<{ id: string; coords: LatLng }>> = {}
    const routeRequests: Array<{
      containerId: string
      startPoint: LatLng | null
      stops: Array<{ orderId: string; lat: number; lng: number }>
    }> = []

    for (const containerId of Object.keys(nextContainers)) {
      const ids = nextContainers[containerId] || []
      const withCoords: Array<{ id: string; coords: LatLng }> = []
      const withoutCoords: string[] = []
      for (const id of ids) {
        const coords = coordsById[id]
        if (coords) withCoords.push({ id, coords })
        else withoutCoords.push(id)
      }
      withCoordsByContainer[containerId] = withCoords
      withoutCoordsByContainer[containerId] = withoutCoords

      if (withCoords.length > 0) {
        const startPoint = courierStartById.get(containerId) ?? warehousePoint ?? null
        routeRequests.push({
          containerId,
          startPoint,
          stops: withCoords.map((w) => ({ orderId: w.id, lat: w.coords.lat, lng: w.coords.lng })),
        })
      } else {
        nextContainers[containerId] = [...withoutCoords]
      }
    }

    let roadPolylinesNext: Record<string, LatLng[]> = {}
    let statsNext: Record<string, { durationSec: number | null; source: string }> = {}
    let usedServerOptimization = false

    if (routeRequests.length > 0) {
      try {
        const response = await fetch('/api/admin/dispatch/ors-optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routes: routeRequests }),
        })
        if (response.ok) {
          const data: unknown = await response.json().catch(() => null)
          const rawRoutes =
            data &&
            typeof data === 'object' &&
            Array.isArray((data as { routes?: unknown }).routes)
              ? (data as { routes: unknown[] }).routes
              : []

          const byContainer = new Map<
            string,
            {
              durationSec: number | null
              source: string
              orderedOrderIds: string[]
              polyline: LatLng[]
            }
          >()

          for (const rawRoute of rawRoutes) {
            if (!rawRoute || typeof rawRoute !== 'object') continue
            const route = rawRoute as Record<string, unknown>

            const containerIdRaw = route.containerId
            const containerId =
              typeof containerIdRaw === 'string' || typeof containerIdRaw === 'number'
                ? String(containerIdRaw)
                : ''
            if (!containerId) continue

            const orderedOrderIds = Array.isArray(route.orderedOrderIds)
              ? route.orderedOrderIds.map((id) => String(id))
              : []

            const polyline = Array.isArray(route.polyline)
              ? route.polyline
                .map((point) => {
                  if (!point || typeof point !== 'object') return null
                  const coord = point as Record<string, unknown>
                  const lat = Number(coord.lat)
                  const lng = Number(coord.lng)
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
                  return { lat, lng }
                })
                .filter((point): point is LatLng => point !== null)
              : []

            const durationRaw = route.durationSec
            const durationSec =
              typeof durationRaw === 'number' && Number.isFinite(durationRaw) ? durationRaw : null
            const source = typeof route.source === 'string' ? route.source : 'unknown'

            byContainer.set(containerId, {
              durationSec,
              source,
              orderedOrderIds,
              polyline,
            })
          }

          for (const containerId of Object.keys(nextContainers)) {
            const route = byContainer.get(containerId)
            const withCoords = withCoordsByContainer[containerId] || []
            const withoutCoords = withoutCoordsByContainer[containerId] || []
            const allowed = new Set(withCoords.map((w) => w.id))

            if (route) {
              const durationSec = typeof route.durationSec === 'number' && Number.isFinite(route.durationSec) ? route.durationSec : null
              const source = typeof route.source === 'string' ? route.source : 'unknown'
              statsNext[containerId] = { durationSec, source }
            } else {
              statsNext[containerId] = { durationSec: null, source: 'none' }
            }

            if (route && route.orderedOrderIds.length > 0) {
              const ordered = route.orderedOrderIds.filter((id) => allowed.has(id))
              const missing = withCoords.map((w) => w.id).filter((id) => !ordered.includes(id))
              nextContainers[containerId] = [...ordered, ...missing, ...withoutCoords]
            } else if (withCoords.length > 0) {
              const startPoint = courierStartById.get(containerId) ?? warehousePoint
              const orderedWithCoords = startPoint
                ? optimizeNearestNeighbor(startPoint, withCoords)
                : withCoords.map((w) => w.id)
              nextContainers[containerId] = [...orderedWithCoords, ...withoutCoords]
            }

            if (route && route.polyline.length >= 2) {
              roadPolylinesNext[containerId] = route.polyline
              }
          }

          usedServerOptimization = true
        }
      } catch {
        // Fallback below
      }
    }

    if (!usedServerOptimization) {
      roadPolylinesNext = {}
      statsNext = {}
      for (const containerId of Object.keys(nextContainers)) {
        const withCoords = withCoordsByContainer[containerId] || []
        const withoutCoords = withoutCoordsByContainer[containerId] || []
        if (withCoords.length === 0) {
          statsNext[containerId] = { durationSec: null, source: 'none' }
          continue
        }
        const startPoint = courierStartById.get(containerId) ?? warehousePoint
        const orderedWithCoords = startPoint
          ? optimizeNearestNeighbor(startPoint, withCoords)
          : withCoords.map((w) => w.id)
        nextContainers[containerId] = [...orderedWithCoords, ...withoutCoords]

        const line: LatLng[] = []
        if (startPoint) line.push(startPoint)
        for (const id of orderedWithCoords) {
          const c = coordsById[id]
          if (c) line.push(c)
        }
        const totalKm = line.reduce((acc, cur, idx) => {
          if (idx === 0) return 0
          return acc + haversineDistance(line[idx - 1], cur)
        }, 0)
        const durationSec = Number.isFinite(totalKm) && totalKm > 0 ? (totalKm / 25) * 3600 : null
        statsNext[containerId] = { durationSec, source: 'fallback' }
      }
    }

    setContainers(nextContainers)
    setRoadPolylineByContainer(roadPolylinesNext)
    setRouteStatsByContainer(statsNext)
    setOrderNumberById((prevNumbers) => {
      let numbersNext: Record<string, number | undefined> = { ...prevNumbers }
      for (const containerId of Object.keys(nextContainers)) {
        numbersNext = renumberInOrder(nextContainers[containerId] || [], numbersNext)
      }
      return numbersNext as Record<string, number>
    })
  }, [containers, coordsById, courierStartById, safeCouriers, warehousePoint])

  useEffect(() => {
    if (!open) return
    if (!autoSortOnOpen) return
    // allow initial state to mount first
    const t = setTimeout(() => {
      void applyAutoSortAll()
    }, 50)
    return () => clearTimeout(t)
  }, [applyAutoSortAll, autoSortOnOpen, open])

  useEffect(() => {
    if (!open) return
    if (!autoSortOnOpen) return
    if (Object.keys(coordsById).length === 0) return

    const t = setTimeout(() => {
      void applyAutoSortAll()
    }, 250)
    return () => clearTimeout(t)
  }, [applyAutoSortAll, autoSortOnOpen, coordsById, open])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id
    if (!overId) return

    const active = String(event.active.id)
    const over = String(overId)

    setContainers((prev) => {
      const activeContainer = findContainerForId(prev, active)
      const overContainer = findContainerForId(prev, over)
      if (!activeContainer || !overContainer) return prev
      if (activeContainer === overContainer) return prev

      const activeItems = prev[activeContainer] || []
      const overItems = prev[overContainer] || []
      const activeIndex = activeItems.indexOf(active)
      if (activeIndex === -1) return prev

      const nextActive = activeItems.filter((id) => id !== active)

      const overIndex = overItems.includes(over) ? overItems.indexOf(over) : overItems.length
      const nextOver = [...overItems.slice(0, overIndex), active, ...overItems.slice(overIndex)]

      const next = { ...prev, [activeContainer]: nextActive, [overContainer]: nextOver }
      markContainersDirty([activeContainer, overContainer])

      // Renumber affected containers
      setOrderNumberById((numbersPrev) => {
        let numbersNext = { ...numbersPrev }
        numbersNext = renumberInOrder(next[activeContainer], numbersNext) as Record<string, number>
        numbersNext = renumberInOrder(next[overContainer], numbersNext) as Record<string, number>
        return numbersNext
      })

      return next
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    setContainers((prev) => {
      const containerId = findContainerForId(prev, activeId)
      const overContainerId = findContainerForId(prev, overId)
      if (!containerId || !overContainerId) return prev
      if (containerId !== overContainerId) return prev

      const items = prev[containerId] || []
      const oldIndex = items.indexOf(activeId)
      const newIndex = items.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev

      const nextItems = arrayMove(items, oldIndex, newIndex)
      const next = { ...prev, [containerId]: nextItems }
      markContainersDirty([containerId])

      setOrderNumberById((numbersPrev) => (renumberInOrder(nextItems, numbersPrev) as Record<string, number>))
      return next
    })
  }

  const swapOrderNumbers = (orderId: string, nextNumber: number) => {
    if (!Number.isFinite(nextNumber)) return
    const allIds = Object.values(containers).flat()
    const targetId = allIds.find((id) => orderNumberById[id] === nextNumber)
    if (!targetId) {
      toast.error('Можно указать только номер из текущего списка')
      return
    }
    if (targetId === orderId) return

    setOrderNumberById((prev) => {
      const a = prev[orderId]
      const b = prev[targetId]
      if (typeof a !== 'number' || typeof b !== 'number') return prev
      return { ...prev, [orderId]: b, [targetId]: a }
    })
  }

  const saveReorder = async ({
    closeOnSuccess = true,
    toastOnSuccess = true,
  }: {
    closeOnSuccess?: boolean
    toastOnSuccess?: boolean
  } = {}) => {
    const orderIds = Object.values(containers).flat()
    if (orderIds.length === 0) return

    setIsSaving(true)
    try {
      const updates = orderIds.map((id) => {
        const containerId = findContainerForId(containers, id)
        return {
          orderId: id,
          orderNumber: orderNumberById[id],
          courierId: !containerId || containerId === UNASSIGNED ? null : containerId,
        }
      })

      const res = await fetch('/api/admin/orders/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((data && data.error) || 'Ошибка сохранения')
      }

      if (toastOnSuccess) toast.success('Сохранено')
      onSaved()
      if (closeOnSuccess) onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка сохранения')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const startDay = async () => {
    if (!selectedDateISO) {
      toast.error('Дата не выбрана')
      return
    }

    const unassignedCount = (containers[UNASSIGNED] || []).length
    if (unassignedCount > 0) {
      toast.error('Назначьте курьеров всем заказам', { description: `Без курьера: ${unassignedCount}` })
      return
    }

    setIsStarting(true)
    try {
      await saveReorder({ closeOnSuccess: false, toastOnSuccess: false })

      const res = await fetch('/api/admin/dispatch/start-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateISO }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((data && data.error) || 'Ошибка запуска')
      }

      setIsDayActiveOverride(true)
      toast.success('День начат', {
        description: `Отправлено курьерам: ${data && typeof data.updatedCount === 'number' ? data.updatedCount : 0}`,
      })
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка запуска')
    } finally {
      setIsStarting(false)
    }
  }

  const primaryAction = async () => {
    if (isSaving || isStarting) return
    if (isDayActive) {
      try {
        await saveReorder()
      } catch {
        // errors are already surfaced via toast in saveReorder
      }
      return
    }
    if (isTodaySelected) {
      await startDay()
      return
    }

    try {
      await saveReorder()
    } catch {
      // errors are already surfaced via toast in saveReorder
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
 className="inset-0 left-0 right-0 h-[100svh] !w-screen !max-w-none p-0 gap-0 sm:!w-screen sm:!max-w-none md:!max-w-none lg:!max-w-none xl:!max-w-none"
      >
 <SheetHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SheetTitle className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            {uiText.title(selectedDateLabel)}
            <Badge variant={isDayActive ? 'default' : 'outline'} className="ml-2 text-[10px]">
              {isDayActive ? uiText.statusActive : uiText.statusPlanned}
            </Badge>
          </SheetTitle>
          <SheetDescription>{uiText.description}</SheetDescription>

          <div className="pt-2">
            <Input
              placeholder={uiText.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 sm:max-w-[360px]"
            />
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-auto">
 <div className="bg-muted/10">
            <div className="h-[46svh] lg:h-[52svh] w-full">
              <DispatchLeafletMap
                suspendFit={!!activeId}
                warehouse={warehousePoint}
                markers={mapDataForRender.markers}
                polylines={mapDataForRender.polylines}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {allContainerIds.map((containerId) => {
                    const isUnassigned = containerId === UNASSIGNED
                    const name = isUnassigned
                      ? uiText.unassigned
                      : courierNameById.get(containerId) || `${uiText.courierFallback} ${containerId.slice(0, 6)}`
                    const color = isUnassigned ? '#94A3B8' : getCourierColor(containerId)
                    const ids = containers[containerId] || []
                    const visibleIds = filteredOrderIds ? ids.filter((id) => filteredOrderIds.has(id)) : ids
                    const stats = routeStatsByContainer[containerId]
                    const durationSec = stats?.durationSec
                    const durationMin =
                      typeof durationSec === 'number' && Number.isFinite(durationSec)
                        ? Math.max(1, Math.round(durationSec / 60))
                        : null
                    const approx = stats?.source && stats.source !== 'ors'

                  return (
                    <DroppableColumn key={containerId} id={containerId}>
 <div className="rounded-lg bg-muted/10 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                            <div className="truncate text-sm font-semibold">{name}</div>
                            <Badge variant="outline" className="text-[10px] tabular-nums">{ids.length}</Badge>
                            {durationMin != null && (
                              <Badge variant="secondary" className="text-[10px] tabular-nums">
                                {approx ? '≈' : ''}
                                {durationMin} min
                              </Badge>
                            )}
                          </div>
                        </div>

                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {visibleIds.map((id) => {
                              const o = orderById.get(id)
                              if (!o) return null
                              const n = orderNumberById[id]
                              const coords = coordsById[id]
                              const courierName = isUnassigned
                                ? uiText.unassigned
                                : (courierNameById.get(containerId) || uiText.courierFallback)
                              return (
                                <SortableOrderItem
                                  key={id}
                                  order={o}
                                  color={color}
                                  courierName={courierName}
                                  number={n}
                                  coords={coords}
                                  onNumberChange={(next) => swapOrderNumbers(id, next)}
                                />
                              )
                            })}
                            {visibleIds.length === 0 && (
                              <div className="py-6 text-center text-xs text-muted-foreground">{uiText.noOrders}</div>
                            )}
                          </div>
                        </SortableContext>
                      </div>
                    </DroppableColumn>
                  )
                })}
              </div>
            </DndContext>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <div>{uiText.couriers}:</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {safeCouriers.map((c) => (
 <div key={c.id} className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getCourierColor(c.id) }} />
                    <div className="text-xs">{c.name}</div>
                  </div>
                ))}
 <div className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#94A3B8' }} />
                  <div className="text-xs">{uiText.unassigned}</div>
                </div>
              </div>
            </div>

            {activeId && (
              <div className="text-xs text-muted-foreground">
                {uiText.dragging}:{' '}
                {orderNumberById[activeId] ? `#${orderNumberById[activeId]}` : activeId}
              </div>
            )}
          </div>
        </div>

 <SheetFooter className="bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="w-full flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving || isStarting}>
              {uiText.close}
            </Button>

            <Button
              size="sm"
              className="min-w-[140px]"
              onClick={() => void primaryAction()}
              disabled={isSaving || isStarting}
              aria-busy={isSaving || isStarting}
            >
              {isSaving || isStarting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isDayActive ? (
                <Save className="w-4 h-4 mr-2" />
              ) : isTodaySelected ? (
                <Play className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}

              {isDayActive
                ? isSaving
                  ? uiText.saving
                  : uiText.save
                : isTodaySelected
                  ? isStarting
                    ? uiText.starting
                    : uiText.start
                  : isSaving
                    ? uiText.saving
                    : uiText.save}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
