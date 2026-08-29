'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, MapPinned, Plus, Route as RouteIcon, Save, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecondaryResourceRail, type SecondaryResourceRailItem } from '@/components/admin/dashboard/shared/SecondaryResourceRail'
import { ResourceLocalActionBar } from '@/components/admin/dashboard/shared/ResourceLocalActionBar'
import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { ColorSquarePalette, RESOURCE_COLOR_PALETTE } from '@/components/admin/dashboard/shared/ColorSquarePalette'
import { useLanguage } from '@/contexts/LanguageContext'
import { buildGoogleMapsRouteUrl } from '@/lib/routes/map-url'

const COLORS = RESOURCE_COLOR_PALETTE

type RouteStop = { id: string; position: number; order: { id: string; orderNumber: number; deliveryDate?: string | null; deliveryAddress: string; latitude?: number | null; longitude?: number | null; customer: { name: string } } }
type DeliveryRoute = { id: string; name: string; color: string; weekStart: string; isActive: boolean; deletedAt?: string | null; boundary?: RouteBoundary | null; courier: { id: string; name: string }; stops: RouteStop[] }
type Courier = { id: string; name: string; isActive: boolean }
type Order = { id: string; orderNumber: number; deliveryDate?: string | null; deliveryAddress: string; latitude?: number | null; longitude?: number | null; customer: { name: string } }
type RouteBoundary = { x: number; y: number; width: number; height: number }

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

export function RoutesTab({ createNonce = 0, selectedIds, onSelectionChange, showDeleted = false, searchTerm = '', universalEdit = false, onUniversalEditHandled }: RoutesTabProps) {
  const { language } = useLanguage()
  const isUzbek = language === 'uz'
  const [weekStart, setWeekStart] = useState(() => localDateValue(mondayOf(new Date())))
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null)
  const [isDraftOpen, setIsDraftOpen] = useState(false)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [isSelectedElementsOpen, setIsSelectedElementsOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState<string>(COLORS[0])
  const [draftCourierId, setDraftCourierId] = useState('')
  const [draftOrderIds, setDraftOrderIds] = useState<string[]>([])
  const [draftBoundary, setDraftBoundary] = useState<RouteBoundary | null>(null)
  const [boundaryStart, setBoundaryStart] = useState<{ x: number; y: number } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
    setCouriers(Array.isArray(courierData) ? courierData.filter((row) => row?.role === 'COURIER') : [])
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
      setDraftBoundary(null)
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
      setDraftBoundary(selectedRouteForEdit.boundary ?? null)
      setIsDraftOpen(true)
    }
    onUniversalEditHandled?.()
  }, [onUniversalEditHandled, routes, selectedIds, showDeleted, universalEdit])

  const selectedDayKey = localDateValue(selectedDay)
  const effectiveSelectedRouteId = selectedIds === undefined ? selectedRouteId : selectedIds[0] ?? null
  const visibleRoutes = routes.filter((route) => showDeleted ? Boolean(route.deletedAt) : !route.deletedAt)
  const selectedRoute = visibleRoutes.find((route) => route.id === effectiveSelectedRouteId) ?? visibleRoutes[0] ?? null
  const selectRoute = (id: string) => {
    setSelectedRouteId(id)
    onSelectionChange?.([id])
  }
  const dayOrders = useMemo(() => {
    if (!selectedRoute) return orders.filter((order) => !order.deliveryDate || dateKey(order.deliveryDate) === selectedDayKey)
    return selectedRoute.stops.filter((stop) => !stop.order.deliveryDate || dateKey(stop.order.deliveryDate) === selectedDayKey).map((stop) => ({ ...stop.order, id: stop.order.id }))
  }, [orders, selectedDayKey, selectedRoute])
  const mapUrl = useMemo(() => buildGoogleMapsRouteUrl(dayOrders), [dayOrders])
  const railItems: SecondaryResourceRailItem[] = visibleRoutes.map((route) => ({ id: route.id, title: route.name, meta: route.courier.name, color: route.color, amount: `${route.stops.length}` }))
  const labels = isUzbek ? { title: 'Marshrutlar', previous: 'Oldingi', next: 'Keyingi', save: 'Saqlash', back: 'Orqaga', create: 'Yangi marshrut', name: 'Nomi', courier: 'Kuryer', orders: 'Buyurtmalar', empty: 'Marshrut tanlanmagan', noOrders: 'Buyurtmalar yo‘q', openMap: 'Xaritani ochish', selectArea: 'Hududni belgilash', moveUp: 'Yuqoriga', moveDown: 'Pastga' } : { title: 'Маршруты', previous: 'Предыдущий', next: 'Следующий', save: 'Сохранить', back: 'Назад', create: 'Новый маршрут', name: 'Название', courier: 'Курьер', orders: 'Заказы', empty: 'Маршрут не выбран', noOrders: 'Заказов нет', openMap: 'Открыть карту', selectArea: 'Выделить область', moveUp: 'Вверх', moveDown: 'Вниз' }

  const shiftWeek = (direction: 1 | -1) => {
    setSelectedDay((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + direction * 7)
      return next
    })
    setWeekStart((current) => {
      const next = new Date(`${current}T00:00:00`)
      next.setDate(next.getDate() + direction * 7)
      return localDateValue(next)
    })
  }
  const saveDraft = async () => {
    if (!draftName.trim() || !draftCourierId || isSaving) return
    setIsSaving(true)
    try {
      const payload = { name: draftName, color: draftColor, courierId: draftCourierId, weekStart, orderIds: draftOrderIds, boundary: draftBoundary }
      const response = await fetch(editingRouteId ? `/api/admin/routes/${editingRouteId}` : '/api/admin/routes', { method: editingRouteId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) return
      setIsDraftOpen(false); setEditingRouteId(null); setDraftName(''); setDraftOrderIds([]); setDraftBoundary(null); setBoundaryStart(null); await load()
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
  const getBoundaryPoint = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) }
  }
  const handleBoundaryPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!isDraftOpen || (event.target as HTMLElement).closest('a,button')) return
    const point = getBoundaryPoint(event)
    setBoundaryStart(point)
    setDraftBoundary(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handleBoundaryPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!boundaryStart) return
    const point = getBoundaryPoint(event)
    const boundary = { x: Math.min(boundaryStart.x, point.x), y: Math.min(boundaryStart.y, point.y), width: Math.abs(point.x - boundaryStart.x), height: Math.abs(point.y - boundaryStart.y) }
    if (boundary.width > 0.02 && boundary.height > 0.02) setDraftBoundary(boundary)
    setBoundaryStart(null)
  }

  const moveStop = (index: number, direction: -1 | 1) => {
    if (!selectedRoute) return
    const next = [...selectedRoute.stops]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRoutes((current) => current.map((route) => route.id === selectedRoute.id ? { ...route, stops: next.map((stop, position) => ({ ...stop, position })) } : route))
  }

  const activeBoundary = draftBoundary ?? selectedRoute?.boundary ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 gap-3">
        {isSelectedElementsOpen ? <section data-reference-selected-elements="routes" className="min-w-0 flex-1 space-y-3 overflow-auto p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{isUzbek ? 'Tanlangan marshrutlar' : 'Выбранные маршруты'}</h2><Button type="button" variant="ghost" onClick={() => setIsSelectedElementsOpen(false)}>{labels.back}</Button></div><div className="divide-y border-y" role="list" aria-label={isUzbek ? 'Tanlangan marshrutlar' : 'Выбранные маршруты'}>{visibleRoutes.filter((route) => selectedIds?.includes(route.id)).map((route) => <button key={route.id} type="button" role="listitem" className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => { setIsSelectedElementsOpen(false); setSelectedRouteId(route.id) }}><span className="truncate text-sm font-medium">{route.name}</span><span className="text-xs text-muted-foreground">{isUzbek ? 'Ochish' : 'Открыть'}</span></button>)}</div></section> : <SecondaryResourceRail resourceKind="routes" selectedIds={selectedIds} onSelectionChange={onSelectionChange} selectionLabel={(item) => isUzbek ? `Tanlash ${item.title}` : `Выбрать ${item.title}`} ariaLabel={labels.title} items={railItems} selectedId={selectedRoute?.id ?? null} expandedId={expandedRouteId} onSelect={selectRoute} onToggle={(id) => setExpandedRouteId((current) => current === id ? null : id)} emptyLabel={labels.empty} renderExpanded={(item) => {
          const route = routes.find((candidate) => candidate.id === item.id)
          if (!route) return null
          return <div className="space-y-2 text-xs text-muted-foreground"><div>{route.stops.length} {labels.orders}</div><ResourceCalendarPanel resourceType="ROUTE" resourceId={route.id} compact /></div>
        }} />}
        <section className="min-w-0 flex-1 space-y-3 overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><RouteIcon className="size-5" /><h1 className="text-lg font-semibold">{labels.title}</h1></div>
            <Button type="button" size="sm" onClick={() => { setEditingRouteId(null); setDraftName(''); setDraftColor(COLORS[0]); setDraftCourierId(''); setDraftOrderIds([]); setDraftBoundary(null); setIsDraftOpen((current) => !current) }}><Plus className="mr-1 size-4" />{labels.create}</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-2 py-1">
            <Button variant="ghost" size="sm" onClick={() => shiftWeek(-1)}><ArrowLeft className="mr-1 size-4" />{labels.previous}</Button>
            <div className="flex items-center gap-2 text-xs"><Input type="date" value={selectedDayKey} onChange={(event) => { const next = new Date(`${event.target.value}T00:00:00`); setSelectedDay(next); setWeekStart(localDateValue(mondayOf(next))) }} className="h-8 w-[145px]" /><span>{weekStart}</span></div>
            <Button variant="ghost" size="sm" onClick={() => shiftWeek(1)}>{labels.next}<ArrowRight className="ml-1 size-4" /></Button>
          </div>
          {isDraftOpen ? <div data-reference-route-editor={editingRouteId ? 'edit' : 'create'} className="grid gap-2 bg-card p-3 sm:grid-cols-[1fr_180px_180px_auto]">
            <div><Label htmlFor="route-name">{labels.name}</Label><Input id="route-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /></div>
            <div><Label htmlFor="route-courier">{labels.courier}</Label><Select value={draftCourierId} onValueChange={setDraftCourierId}><SelectTrigger id="route-courier"><SelectValue placeholder={labels.courier} /></SelectTrigger><SelectContent>{couriers.map((courier) => <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isUzbek ? 'Rang' : 'Цвет'}</Label><ColorSquarePalette value={draftColor} onChange={setDraftColor} label={isUzbek ? 'Rang' : 'Цвет'} colors={COLORS} /></div>
            <Button className="self-end" type="button" onClick={() => void saveDraft()} disabled={!draftName.trim() || !draftCourierId || isSaving}><Save className="mr-1 size-4" />{labels.save}</Button>
            <div data-reference-route-draft-orders className="flex min-w-0 flex-wrap gap-1 sm:col-span-4" aria-label={labels.orders}>
              {orders.map((order) => {
                const selected = draftOrderIds.includes(order.id)
                return <button key={order.id} type="button" aria-label={`#${order.orderNumber} ${order.customer.name}`} aria-pressed={selected} title={order.deliveryAddress} onClick={() => setDraftOrderIds((current) => selected ? current.filter((id) => id !== order.id) : [...current, order.id])} className={`flex size-9 items-center justify-center text-xs font-semibold ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground'}`} style={{ borderBottom: `3px solid ${draftColor}` }}>{initials(order.customer.name)}</button>
              })}
            </div>
          </div> : null}
          <div data-reference-map="routes" className="relative min-h-[330px] bg-transparent p-3" onPointerDown={handleBoundaryPointerDown} onPointerUp={handleBoundaryPointerUp}>
            {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="absolute right-3 top-3 z-10 text-xs underline" aria-label={labels.openMap}>{labels.openMap}</a> : null}
            {isDraftOpen ? <Button type="button" variant="ghost" size="sm" className="absolute left-3 top-3 z-10 text-xs" onClick={() => setDraftBoundary({ x: 0.15, y: 0.2, width: 0.5, height: 0.5 })}>{labels.selectArea}</Button> : null}
            {activeBoundary ? <div data-reference-route-boundary className="pointer-events-none absolute z-10 bg-primary/20" style={{ left: `${activeBoundary.x * 100}%`, top: `${activeBoundary.y * 100}%`, width: `${activeBoundary.width * 100}%`, height: `${activeBoundary.height * 100}%`, border: `2px solid ${draftBoundary ? draftColor : selectedRoute?.color ?? COLORS[0]}` }} /> : null}
            <div className="relative flex min-h-[300px] flex-wrap content-start gap-2"><MapPinned className="absolute right-3 top-3 size-5 text-muted-foreground" />{dayOrders.length ? dayOrders.map((order, index) => <div key={order.id} data-route-order-id={order.id} title={order.deliveryAddress} className="flex size-11 items-center justify-center bg-card text-xs font-semibold" style={{ borderBottom: `4px solid ${selectedRoute?.color ?? COLORS[index % COLORS.length]}` }}>{initials(order.customer.name)}</div>) : <p className="m-auto text-sm text-muted-foreground">{labels.noOrders}</p>}</div>
          </div>
          {selectedRoute ? <div className="space-y-1 bg-card p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="size-3" style={{ backgroundColor: selectedRoute.color }} /><span className="font-medium">{selectedRoute.name}</span><span className="text-xs text-muted-foreground">{selectedRoute.courier.name}</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={() => void saveSelectedRoute()} disabled={isSaving || showDeleted}><Save className="mr-1 size-4" />{labels.save}</Button><Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void updateSelectedRouteTrash()} disabled={isSaving} title={showDeleted ? (isUzbek ? 'Tiklash' : 'Восстановить') : (isUzbek ? 'Savatga yuborish' : 'В корзину')} aria-label={showDeleted ? (isUzbek ? 'Tiklash' : 'Восстановить') : (isUzbek ? 'Savatga yuborish' : 'В корзину')}>{showDeleted ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}</Button></div></div>{selectedRoute.stops.map((stop, index) => <div key={stop.id} data-reference-route-stop className="flex items-center gap-2 bg-muted/30 px-2 py-1 text-sm"><span className="w-5 text-xs text-muted-foreground">{index + 1}</span><span className="size-7 bg-background text-center text-xs leading-7">{initials(stop.order.customer.name)}</span><span className="min-w-0 flex-1 truncate">#{stop.order.orderNumber} {stop.order.customer.name}</span><ResourceCalendarPanel resourceType="ROUTE_STOP" resourceId={stop.id} days={3} compact /><Button variant="ghost" size="icon" className="size-7" aria-label={labels.moveUp} onClick={() => moveStop(index, -1)} disabled={index === 0}><ChevronUp className="size-4" /></Button><Button variant="ghost" size="icon" className="size-7" aria-label={labels.moveDown} onClick={() => moveStop(index, 1)} disabled={index === selectedRoute.stops.length - 1}><ChevronDown className="size-4" /></Button></div>)}</div> : null}
        </section>
      </div>
      <ResourceLocalActionBar labels={{ back: labels.back, clear: isUzbek ? 'Tozalash' : 'Очистить', cancel: isUzbek ? 'Bekor qilish' : 'Отмена', confirm: isUzbek ? 'Tasdiqlash' : 'Подтвердить', save: labels.save }} hasDraft={Boolean(selectedRoute) || isDraftOpen} canClear={draftOrderIds.length > 0} onBack={() => setIsDraftOpen(false)} onClear={() => setDraftOrderIds([])} onCancel={() => setIsDraftOpen(false)} onConfirm={() => void saveSelectedRoute()} onSave={() => void saveSelectedRoute()} />
    </div>
  )
}
