'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, ArrowRight, MapPin, Plus, Route as RouteIcon, Save, Trash2, RotateCcw, Truck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecondaryResourceRail, type SecondaryResourceRailItem } from '@/components/admin/dashboard/shared/SecondaryResourceRail'
import { ResourceLocalActionBar } from '@/components/admin/dashboard/shared/ResourceLocalActionBar'
import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { ColorSquarePalette, RESOURCE_COLOR_PALETTE } from '@/components/admin/dashboard/shared/ColorSquarePalette'
import { useLanguage } from '@/contexts/LanguageContext'
import { groupRoutesByCourier } from '@/lib/routes/rail-grouping'
import {
  formatPeriodLabel,
  isLegacyPanelBoundary,
  nextMondayInclusive,
  orderIdsInsidePolygon,
  parseRouteBoundary,
  type GeoPoint,
} from '@/lib/routes/geo-polygon'
import { getCourierColor } from '@/lib/courier-colors'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const RoutesLeafletMap = dynamic(() => import('@/components/admin/RoutesLeafletMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
})

const COLORS = RESOURCE_COLOR_PALETTE

type RouteStop = { id: string; position: number; order: { id: string; orderNumber: number; deliveryDate?: string | null; deliveryAddress: string; latitude?: number | null; longitude?: number | null; customer: { id?: string; name: string; latitude?: number | null; longitude?: number | null } } }
type DeliveryRoute = { id: string; name: string; color: string; weekStart: string; isActive: boolean; deletedAt?: string | null; boundary?: unknown; courier: { id: string; name: string }; stops: RouteStop[] }
type Courier = { id: string; name: string; role?: string; isActive: boolean }
type Order = { id: string; orderNumber: number; deliveryDate?: string | null; deliveryAddress: string; latitude?: number | null; longitude?: number | null; customer: { name: string } }

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function mondayOf(input: Date) {
  const date = new Date(input)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return date
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}
function dateKey(value?: string | null) {
  return value ? localDateValue(new Date(value)) : ''
}

type RoutesTabProps = {
  createNonce?: number
  selectedIds?: readonly string[]
  onSelectionChange?: (ids: readonly string[]) => void
  showDeleted?: boolean
  searchTerm?: string
  universalEdit?: boolean
  onUniversalEditHandled?: () => void
}

type OrsLineState = { points: Array<GeoPoint>; source: string } | null

export function RoutesTab({ createNonce = 0, selectedIds, onSelectionChange, showDeleted = false, searchTerm = '', universalEdit = false, onUniversalEditHandled }: RoutesTabProps) {
  const { language } = useLanguage()
  const isUzbek = language === 'uz'
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [weekStart, setWeekStart] = useState(() => localDateValue(mondayOf(new Date())))
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [expandedCourierId, setExpandedCourierId] = useState<string | null>(null)
  const [isSelectedElementsOpen, setIsSelectedElementsOpen] = useState(false)
  const [isDraftOpen, setIsDraftOpen] = useState(false)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState<string>(COLORS[0])
  const [draftCourierId, setDraftCourierId] = useState('')
  const [draftOrderIds, setDraftOrderIds] = useState<string[]>([])
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<GeoPoint[]>([])
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [orsLine, setOrsLine] = useState<OrsLineState>(null)
  const orsRequestIdRef = useRef(0)

  const selectedDayKey = localDateValue(selectedDay)

  const load = useCallback(async () => {
    const [routeResponse, courierResponse, orderResponse] = await Promise.all([
      fetch(`/api/admin/routes?weekStart=${encodeURIComponent(weekStart)}${searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim().slice(0, 120))}` : ''}`),
      fetch('/api/admin/couriers?limit=100'),
      fetch('/api/orders?limit=100'),
    ])
    const routeData = routeResponse.ok ? await routeResponse.json() : []
    const courierData = courierResponse.ok ? await courierResponse.json() : []
    const orderData = orderResponse.ok ? await orderResponse.json() : []
    setRoutes(Array.isArray(routeData) ? routeData : [])
    setCouriers(Array.isArray(courierData) ? courierData.filter((row: Courier) => row?.role === 'COURIER') : [])
    const rawOrders = Array.isArray(orderData) ? orderData : Array.isArray(orderData?.orders) ? orderData.orders : []
    setOrders(rawOrders.filter((row: Order) => !row.deliveryDate || dateKey(row.deliveryDate) >= weekStart && dateKey(row.deliveryDate) < localDateValue(new Date(new Date(`${weekStart}T00:00:00`).getTime() + 7 * 86400000))))
  }, [searchTerm, weekStart])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (createNonce > 0) {
      setEditingRouteId(null)
      setDraftName('')
      setDraftColor(COLORS[0])
      setDraftCourierId('')
      setDraftOrderIds([])
      setDraftPolygonPoints([])
      setIsDrawingPolygon(false)
      setIsDraftOpen(true)
    }
  }, [createNonce])

  useEffect(() => {
    if (!universalEdit || showDeleted) return
    const selectedRouteForEdit = selectedIds?.length === 1 ? routes.find((route) => route.id === selectedIds[0] && !route.deletedAt) : undefined
    if ((selectedIds?.length ?? 0) > 1) {
      setIsSelectedElementsOpen(true)
    } else if (selectedRouteForEdit) {
      setSelectedRouteId(selectedRouteForEdit.id)
      setEditingRouteId(selectedRouteForEdit.id)
      setDraftName(selectedRouteForEdit.name)
      setDraftColor(selectedRouteForEdit.color)
      setDraftCourierId(selectedRouteForEdit.courier.id)
      setDraftOrderIds(selectedRouteForEdit.stops.map((stop) => stop.order.id))
      const existingPolygon = parseRouteBoundary(selectedRouteForEdit.boundary)
      setDraftPolygonPoints(existingPolygon?.points ?? [])
      setIsDrawingPolygon(!existingPolygon)
      setIsDraftOpen(true)
    }
    onUniversalEditHandled?.()
  }, [onUniversalEditHandled, routes, selectedIds, showDeleted, universalEdit])

  const effectiveSelectedRouteId = selectedIds === undefined ? selectedRouteId : selectedIds[0] ?? null
  const visibleRoutes = routes.filter((route) => showDeleted ? Boolean(route.deletedAt) : !route.deletedAt)
  const selectedRoute = visibleRoutes.find((route) => route.id === effectiveSelectedRouteId) ?? null
  const selectRoute = (id: string) => {
    setSelectedRouteId(id)
    const route = visibleRoutes.find((candidate) => candidate.id === id)
    if (route) setExpandedCourierId(route.courier.id)
    onSelectionChange?.([id])
  }

  // R40: the day's orders drive the map markers.
  const dayOrders = useMemo(() => orders.filter((order) => !order.deliveryDate || dateKey(order.deliveryDate) === selectedDayKey), [orders, selectedDayKey])

  const courierGroups = useMemo(() => groupRoutesByCourier(visibleRoutes), [visibleRoutes])
  const railItems: SecondaryResourceRailItem[] = courierGroups.map((group) => ({ id: group.courierId, title: group.courierName, meta: isUzbek ? `${group.routes.length} marshrut` : `${group.routes.length} маршрут(ов)`, color: group.color ?? undefined, amount: `${group.totalStops}`, icon: <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-white" style={{ backgroundColor: group.color ?? '#64748b' }}><Truck className="size-3.5" aria-hidden="true" /></span> }))
  const labels = isUzbek ? { title: 'Marshrutlar', previous: 'Oldingi', next: 'Davom etish', save: 'Saqlash', back: 'Orqaga', create: 'Yangi marshrut', name: 'Nomi', courier: 'Kuryer', orders: 'Buyurtmalar', empty: 'Marshrut tanlanmagan', noOrders: 'Buyurtmalar yo‘q', closeArea: 'Hududni yopish', redraw: 'Qayta chizish', period: 'Davr', drawingHint: 'Xaritaga bosib hududni chizing (kamida 3 nuqta), yopish uchun ikki marta bosing', stops: 'To‘xtamlar' } : { title: 'Маршруты', previous: 'Предыдущий', next: 'Продолжить', save: 'Сохранить', back: 'Назад', create: 'Новый маршрут', name: 'Название', courier: 'Курьер', orders: 'Заказы', empty: 'Маршрут не выбран', noOrders: 'Заказов нет', closeArea: 'Замкнуть область', redraw: 'Перерисовать', period: 'Период', drawingHint: 'Кликайте по карте, чтобы нарисовать область (минимум 3 точки), двойной клик замыкает', stops: 'Остановки' }

  // R39/R46: «Предыдущий»/«Продолжить» walk by DAY; the period label follows
  // the selected day through the next Monday (inclusive) — today → next Monday
  // by default.
  const periodEnd = useMemo(() => nextMondayInclusive(selectedDay), [selectedDay])
  const periodLabel = useMemo(() => formatPeriodLabel(selectedDay, periodEnd), [selectedDay, periodEnd])
  const shiftDay = (direction: 1 | -1) => {
    setSelectedDay((current) => {
      const next = new Date(current)
      next.setHours(0, 0, 0, 0)
      next.setDate(next.getDate() + direction)
      setWeekStart(localDateValue(mondayOf(next)))
      return next
    })
  }

  const draftPolygon: GeoPoint[] | null = draftPolygonPoints.length >= 3 ? draftPolygonPoints : null
  const drawingColor = draftCourierId ? getCourierColor(draftCourierId) : draftColor

  // R43: closing the polygon captures the orders whose delivery point falls inside.
  const closePolygon = useCallback(() => {
    if (draftPolygonPoints.length < 3) return
    const entries = dayOrders
      .filter((order) => typeof order.latitude === 'number' && typeof order.longitude === 'number')
      .map((order) => ({ id: order.id, position: { lat: order.latitude as number, lng: order.longitude as number } }))
    const inside = orderIdsInsidePolygon(entries, draftPolygonPoints)
    setDraftOrderIds(inside)
    setIsDrawingPolygon(false)
  }, [draftPolygonPoints, dayOrders])

  const resetDraftPolygon = () => {
    setDraftPolygonPoints([])
    setIsDrawingPolygon(true)
    setDraftOrderIds([])
  }

  // R43/R44: the route line follows the roads — ORS with a straight fallback.
  useEffect(() => {
    if (isDraftOpen || !selectedRoute) {
      setOrsLine(null)
      return
    }
    const stops = selectedRoute.stops
      .map((stop) => {
        const lat = stop.order.customer?.latitude ?? stop.order.latitude ?? null
        const lng = stop.order.customer?.longitude ?? stop.order.longitude ?? null
        return { orderId: stop.order.id, lat, lng }
      })
      .filter((stop): stop is { orderId: string; lat: number; lng: number } => typeof stop.lat === 'number' && typeof stop.lng === 'number')
      .slice(0, 100)
    if (stops.length < 2) {
      setOrsLine(null)
      return
    }
    const requestId = ++orsRequestIdRef.current
    void (async () => {
      try {
        const response = await fetch('/api/admin/dispatch/ors-polyline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routes: [{ containerId: selectedRoute.id, stops }] }),
        })
        if (!response.ok) throw new Error('ors failed')
        const data = await response.json().catch(() => null)
        const polyline = data?.routes?.[0]?.polyline
        const source = typeof data?.routes?.[0]?.source === 'string' ? data.routes[0].source : 'none'
        if (orsRequestIdRef.current !== requestId) return
        setOrsLine({ points: Array.isArray(polyline) ? polyline : [], source })
      } catch {
        if (orsRequestIdRef.current === requestId) setOrsLine({ points: [], source: 'none' })
      }
    })()
    // The key includes the stop order so every reorder redraws the line (R44).
  }, [isDraftOpen, selectedRoute])

  const saveDraft = async () => {
    if (!draftName.trim() || !draftCourierId || isSaving) return
    setIsSaving(true)
    try {
      const boundary = draftPolygon ? { kind: 'geo-polygon' as const, points: draftPolygonPoints } : null
      const payload = { name: draftName, color: draftColor, courierId: draftCourierId, weekStart, orderIds: draftOrderIds, boundary }
      const response = await fetch(editingRouteId ? `/api/admin/routes/${editingRouteId}` : '/api/admin/routes', { method: editingRouteId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) return
      setIsDraftOpen(false); setEditingRouteId(null); setDraftName(''); setDraftOrderIds([]); setDraftPolygonPoints([]); setIsDrawingPolygon(false); await load()
    } finally { setIsSaving(false) }
  }
  const saveSelectedRoute = async () => {
    if (!selectedRoute || isSaving) return
    setIsSaving(true)
    try {
      await fetch(`/api/admin/routes/${selectedRoute.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: selectedRoute.stops.map((stop) => stop.order.id) }) })
      await load()
    } finally { setIsSaving(false) }
  }
  const updateSelectedRouteTrash = async () => {
    if (!selectedRoute || isSaving) return
    setIsSaving(true)
    try {
      await fetch(`/api/admin/routes/${selectedRoute.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletedAt: !showDeleted, isActive: showDeleted }) })
      await load()
    } finally { setIsSaving(false) }
  }

  // R42/R44: dnd reorder of stops — the line redraws through the effect above.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [localStops, setLocalStops] = useState<RouteStop[]>([])
  useEffect(() => { setLocalStops(selectedRoute?.stops ?? []) }, [selectedRoute?.stops, selectedRoute?.id])
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-route-drag-ended', 'true')
    if (!over || active.id === over.id || !selectedRoute) return
    const oldIndex = localStops.findIndex((stop) => stop.id === active.id)
    const newIndex = localStops.findIndex((stop) => stop.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(localStops, oldIndex, newIndex).map((stop, position) => ({ ...stop, position }))
    setLocalStops(reordered)
    setRoutes((current) => current.map((route) => route.id === selectedRoute.id ? { ...route, stops: reordered } : route))
  }

  const selectedPolygon = useMemo(() => {
    const raw = selectedRoute?.boundary
    if (!raw || isLegacyPanelBoundary(raw)) return null
    return parseRouteBoundary(raw)?.points ?? null
  }, [selectedRoute?.boundary])

  const mapMarkers = useMemo(() => {
    if (isDraftOpen) {
      return dayOrders
        .filter((order) => typeof order.latitude === 'number' && typeof order.longitude === 'number')
        .map((order) => ({
          id: order.id,
          position: { lat: order.latitude as number, lng: order.longitude as number },
          color: draftOrderIds.includes(order.id) ? drawingColor : '#94a3b8',
          label: initials(order.customer.name),
          popup: `#${order.orderNumber} ${order.customer.name} — ${order.deliveryAddress}`,
          highlighted: draftOrderIds.includes(order.id),
        }))
    }
    return dayOrders
      .filter((order) => typeof order.latitude === 'number' && typeof order.longitude === 'number')
      .map((order) => {
        const inSelectedRoute = selectedRoute?.stops.some((stop) => stop.order.id === order.id) ?? false
        return {
          id: order.id,
          position: { lat: order.latitude as number, lng: order.longitude as number },
          color: inSelectedRoute ? selectedRoute?.color ?? '#2563eb' : '#94a3b8',
          label: initials(order.customer.name),
          popup: `#${order.orderNumber} ${order.customer.name} — ${order.deliveryAddress}`,
          highlighted: inSelectedRoute,
        }
      })
  }, [dayOrders, draftOrderIds, drawingColor, isDraftOpen, selectedRoute])

  const openCreate = () => {
    setEditingRouteId(null)
    setDraftName('')
    setDraftColor(COLORS[0])
    setDraftCourierId('')
    setDraftOrderIds([])
    setDraftPolygonPoints([])
    setIsDrawingPolygon(true)
    setIsDraftOpen((current) => !current)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Stacked on narrow viewports so the map keeps a usable width: a fixed
          256px side rail would squeeze it to a dead 45px strip on mobile. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        {isSelectedElementsOpen ? <section data-reference-selected-elements="routes" className="min-w-0 flex-1 space-y-3 overflow-auto p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{isUzbek ? 'Tanlangan marshrutlar' : 'Выбранные маршруты'}</h2><Button type="button" variant="ghost" onClick={() => setIsSelectedElementsOpen(false)}>{labels.back}</Button></div><div className="divide-y border-y" role="list" aria-label={isUzbek ? 'Tanlangan marshrutlar' : 'Выбранные маршруты'}>{visibleRoutes.filter((route) => selectedIds?.includes(route.id)).map((route) => <button key={route.id} type="button" role="listitem" className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => { setIsSelectedElementsOpen(false); setSelectedRouteId(route.id) }}><span className="truncate text-sm font-medium">{route.name}</span><span className="text-xs text-muted-foreground">{isUzbek ? 'Ochish' : 'Открыть'}</span></button>)}</div></section> : <SecondaryResourceRail resourceKind="routes" ariaLabel={labels.title} items={railItems} selectedId={selectedRoute?.courier.id ?? null} expandedId={expandedCourierId ?? selectedRoute?.courier.id ?? null} onSelect={(id) => setExpandedCourierId(id)} onToggle={(id) => setExpandedCourierId(id)} emptyLabel={labels.empty} renderExpanded={(item) => {
          const group = courierGroups.find((candidate) => candidate.courierId === item.id)
          if (!group) return null
          return <div className="space-y-1 px-1 pb-1">
            {group.routes.map((entry) => {
              const route = visibleRoutes.find((candidate) => candidate.id === entry.id)
              if (!route) return null
              const checked = selectedIds?.includes(entry.id) ?? false
              return <div key={entry.id} data-reference-resource-row="routes" data-resource-id={entry.id} className="flex min-h-10 items-center gap-1 bg-background px-1">
                <input
                  type="checkbox"
                  aria-label={`${isUzbek ? 'Tanlash' : 'Выбрать'} ${entry.name}`}
                  checked={checked}
                  onChange={(event) => {
                    const next = event.target.checked ? [...(selectedIds ?? []), entry.id] : (selectedIds ?? []).filter((id) => id !== entry.id)
                    onSelectionChange?.(next)
                  }}
                  className="size-3.5 shrink-0"
                />
                <button type="button" onClick={() => { selectRoute(entry.id) }} className="min-w-0 flex-1 text-left focus-visible:outline-none">
                  <span className="block truncate text-xs font-medium text-foreground">{entry.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{entry.weekStart} · {entry.stopCount} {labels.orders.toLowerCase()}</span>
                </button>
                <ResourceCalendarPanel resourceType="ROUTE" resourceId={entry.id} compact />
              </div>
            })}
          </div>
        }} />}
        <section className="min-w-0 flex-1 space-y-3 overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><RouteIcon className="size-5" /><h1 className="text-lg font-semibold">{labels.title}</h1></div>
            <Button type="button" size="sm" onClick={openCreate}><Plus className="mr-1 size-4" />{labels.create}</Button>
          </div>
          {/* R39: «Предыдущий» left, «Продолжить» right, day + period in the
              middle (R46: today → next Monday inclusive). */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-2 py-1">
            <Button variant="ghost" size="sm" data-reference-routes-prev="true" onClick={() => shiftDay(-1)}><ArrowLeft className="mr-1 size-4" />{labels.previous}</Button>
            <div className="flex items-center gap-2 text-xs">
              <Input type="date" value={selectedDayKey} data-reference-routes-day="true" onChange={(event) => { const next = new Date(`${event.target.value}T00:00:00`); setSelectedDay(next); setWeekStart(localDateValue(mondayOf(next))) }} className="h-8 w-[145px]" />
              <span data-reference-routes-period="true">{labels.period}: {periodLabel}</span>
            </div>
            <Button variant="ghost" size="sm" data-reference-routes-next="true" onClick={() => shiftDay(1)}>{labels.next}<ArrowRight className="ml-1 size-4" /></Button>
          </div>
          {isDraftOpen ? <div data-reference-route-editor={editingRouteId ? 'edit' : 'create'} className="grid gap-2 bg-card p-3 sm:grid-cols-[1fr_180px_180px_auto]">
            <div><Label htmlFor="route-name">{labels.name}</Label><Input id="route-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /></div>
            <div><Label htmlFor="route-courier">{labels.courier}</Label><Select value={draftCourierId} onValueChange={setDraftCourierId}><SelectTrigger id="route-courier"><SelectValue placeholder={labels.courier} /></SelectTrigger><SelectContent>{couriers.map((courier) => <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isUzbek ? 'Rang' : 'Цвет'}</Label><ColorSquarePalette value={draftColor} onChange={setDraftColor} label={isUzbek ? 'Rang' : 'Цвет'} colors={COLORS} /></div>
            <Button className="self-end" type="button" onClick={() => void saveDraft()} disabled={!draftName.trim() || !draftCourierId || isSaving}><Save className="mr-1 size-4" />{labels.save}</Button>
            <div className="text-xs text-muted-foreground sm:col-span-4">{labels.drawingHint} · {draftOrderIds.length} {labels.orders.toLowerCase()}{draftPolygonPoints.length > 0 ? <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={resetDraftPolygon}>{labels.redraw}</Button> : null}</div>
          </div> : null}
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
            <div data-reference-map="routes" className="relative h-[330px] w-full overflow-hidden border lg:h-[460px] lg:flex-1">
              <RoutesLeafletMap
                markers={mapMarkers}
                isDrawing={isDraftOpen && isDrawingPolygon}
                draftPoints={draftPolygonPoints}
                onMapClick={(position) => setDraftPolygonPoints((current) => [...current, position])}
                onPolygonClose={closePolygon}
                polygon={isDraftOpen ? null : selectedPolygon}
                polygonColor={isDraftOpen ? drawingColor : selectedRoute?.color ?? '#2563eb'}
                routeLine={orsLine && orsLine.points.length >= 2 ? orsLine.points : null}
                routeLineColor={selectedRoute?.color ?? '#2563eb'}
                lineKey={selectedRoute ? `${selectedRoute.id}:${selectedRoute.stops.map((stop) => stop.order.id).join('|')}` : undefined}
              />
              {isDraftOpen && draftPolygonPoints.length >= 3 ? (
                <Button type="button" variant="ghost" size="sm" className="absolute left-3 top-3 z-[500]" data-reference-route-close-area="true" onClick={closePolygon}>{labels.closeArea}</Button>
              ) : null}
            </div>
            {/* R41: the route sidebar — background of the route color, courier
                initials cube with the professional icon, stop cubes in a row. */}
            {selectedRoute && !isDraftOpen ? (
              <aside data-reference-route-sidebar="true" className="w-full shrink-0 overflow-auto p-3 lg:w-80" style={{ backgroundColor: `${selectedRoute.color}26` }}>
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-[6px] text-xs font-bold text-white" style={{ backgroundColor: selectedRoute.color }}>
                    {initials(selectedRoute.courier.name)}
                  </span>
                  <UserCheck className="size-4 text-foreground/70" aria-hidden="true" />
                  <div className="min-w-0">
                    <p data-reference-route-sidebar-name="true" className="truncate text-sm font-semibold">{selectedRoute.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{selectedRoute.courier.name}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => void saveSelectedRoute()} disabled={isSaving || showDeleted} aria-label={labels.save}><Save className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void updateSelectedRouteTrash()} disabled={isSaving} title={showDeleted ? (isUzbek ? 'Tiklash' : 'Восстановить') : (isUzbek ? 'Savatga yuborish' : 'В корзину')} aria-label={showDeleted ? (isUzbek ? 'Tiklash' : 'Восстановить') : (isUzbek ? 'Savatga yuborish' : 'В корзину')}>{showDeleted ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}</Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1" data-reference-route-cubes="true">
                  {selectedRoute.stops.map((stop) => (
                    <span key={stop.id} title={`#${stop.order.orderNumber} ${stop.order.customer.name}`} className="flex size-8 items-center justify-center rounded-[6px] bg-background text-[10px] font-bold" style={{ border: `2px solid ${selectedRoute.color}` }}>
                      {initials(stop.order.customer.name)}
                    </span>
                  ))}
                  {selectedRoute.stops.length === 0 ? <span className="text-xs text-muted-foreground">{labels.noOrders}</span> : null}
                </div>
                {/* R42: the expanded stop list — drag a stop to any place (1↔9);
                    the map line redraws after the change (R44). */}
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{labels.stops}</p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={localStops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {localStops.map((stop, index) => <SortableStop key={stop.id} stop={stop} index={index} routeColor={selectedRoute.color} />)}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {localStops.length === 0 ? <p className="text-xs text-muted-foreground">{labels.noOrders}</p> : null}
                </div>
              </aside>
            ) : null}
          </div>
          {!selectedRoute && !isDraftOpen ? <p className="bg-card p-3 text-sm text-muted-foreground">{labels.empty}</p> : null}
        </section>
      </div>
      <ResourceLocalActionBar labels={{ back: labels.back, clear: isUzbek ? 'Tozalash' : 'Очистить', cancel: isUzbek ? 'Bekor qilish' : 'Отмена', confirm: isUzbek ? 'Tasdiqlash' : 'Подтвердить', save: labels.save }} hasDraft={Boolean(selectedRoute) || isDraftOpen} canClear={draftOrderIds.length > 0} onBack={() => { setIsDraftOpen(false); setIsDrawingPolygon(false); setDraftPolygonPoints([]) }} onClear={() => setDraftOrderIds([])} onCancel={() => { setIsDraftOpen(false); setIsDrawingPolygon(false); setDraftPolygonPoints([]) }} onConfirm={() => void saveSelectedRoute()} onSave={() => void (isDraftOpen ? saveDraft() : saveSelectedRoute())} />
    </div>
  )
}

function SortableStop({ stop, index, routeColor }: { stop: RouteStop; index: number; routeColor: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id })
  return (
    <div
      ref={setNodeRef}
      data-reference-route-stop
      data-stop-id={stop.order.id}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab items-center gap-2 bg-muted/30 px-2 py-1 text-sm active:cursor-grabbing ${isDragging ? 'z-10 opacity-70' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
      <span className="flex size-7 items-center justify-center rounded-[4px] bg-background text-xs font-bold" style={{ border: `2px solid ${routeColor}` }}>{initials(stop.order.customer.name)}</span>
      <span className="min-w-0 flex-1 truncate">#{stop.order.orderNumber} {stop.order.customer.name}</span>
      <ResourceCalendarPanel resourceType="ROUTE_STOP" resourceId={stop.id} days={3} compact />
      <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
