'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, MapPinned, Plus, Route as RouteIcon, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecondaryResourceRail, type SecondaryResourceRailItem } from '@/components/admin/dashboard/shared/SecondaryResourceRail'
import { ResourceLocalActionBar } from '@/components/admin/dashboard/shared/ResourceLocalActionBar'
import { useLanguage } from '@/contexts/LanguageContext'

const COLORS = ['#c14e24', '#b8862b', '#255e52', '#2563eb', '#7c3aed', '#dc2626', '#0f766e', '#b45309']

type RouteStop = { id: string; position: number; order: { id: string; orderNumber: number; deliveryDate?: string | null; deliveryAddress: string; latitude?: number | null; longitude?: number | null; customer: { name: string } } }
type DeliveryRoute = { id: string; name: string; color: string; weekStart: string; isActive: boolean; deletedAt?: string | null; courier: { id: string; name: string }; stops: RouteStop[] }
type Courier = { id: string; name: string; isActive: boolean }
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

export function RoutesTab({ createNonce = 0 }: { createNonce?: number }) {
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
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState(COLORS[0])
  const [draftCourierId, setDraftCourierId] = useState('')
  const [draftOrderIds, setDraftOrderIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    const [routeResponse, courierResponse, orderResponse] = await Promise.all([
      fetch(`/api/admin/routes?weekStart=${encodeURIComponent(weekStart)}`),
      fetch('/api/admin/couriers?limit=100'),
      fetch('/api/admin/orders?limit=100'),
    ])
    const routeData = routeResponse.ok ? await routeResponse.json() : []
    const courierData = courierResponse.ok ? await courierResponse.json() : []
    const orderData = orderResponse.ok ? await orderResponse.json() : []
    setRoutes(Array.isArray(routeData) ? routeData : [])
    setCouriers(Array.isArray(courierData) ? courierData.filter((row) => row?.role === 'COURIER') : [])
    const rawOrders = Array.isArray(orderData) ? orderData : Array.isArray(orderData?.orders) ? orderData.orders : []
    setOrders(rawOrders.filter((row: Order) => !row.deliveryDate || dateKey(row.deliveryDate) >= weekStart && dateKey(row.deliveryDate) < localDateValue(new Date(new Date(`${weekStart}T00:00:00`).getTime() + 7 * 86400000))))
  }, [weekStart])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (createNonce > 0) setIsDraftOpen(true)
  }, [createNonce])

  const selectedDayKey = localDateValue(selectedDay)
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null
  const dayOrders = useMemo(() => {
    if (!selectedRoute) return orders.filter((order) => !order.deliveryDate || dateKey(order.deliveryDate) === selectedDayKey)
    return selectedRoute.stops.filter((stop) => !stop.order.deliveryDate || dateKey(stop.order.deliveryDate) === selectedDayKey).map((stop) => ({ ...stop.order, id: stop.order.id }))
  }, [orders, selectedDayKey, selectedRoute])
  const railItems: SecondaryResourceRailItem[] = routes.map((route) => ({ id: route.id, title: route.name, meta: route.courier.name, color: route.color, amount: `${route.stops.length}` }))
  const labels = isUzbek ? { title: 'Marshrutlar', previous: 'Oldingi', next: 'Keyingi', save: 'Saqlash', back: 'Orqaga', create: 'Yangi marshrut', name: 'Nomi', courier: 'Kuryer', orders: 'Buyurtmalar', empty: 'Marshrut tanlanmagan', noOrders: 'Buyurtmalar yo‘q' } : { title: 'Маршруты', previous: 'Предыдущий', next: 'Следующий', save: 'Сохранить', back: 'Назад', create: 'Новый маршрут', name: 'Название', courier: 'Курьер', orders: 'Заказы', empty: 'Маршрут не выбран', noOrders: 'Заказов нет' }

  const shiftDay = (direction: 1 | -1) => {
    setSelectedDay((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + direction)
      if (localDateValue(mondayOf(next)) !== weekStart) setWeekStart(localDateValue(mondayOf(next)))
      return next
    })
  }
  const saveDraft = async () => {
    if (!draftName.trim() || !draftCourierId || isSaving) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/routes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draftName, color: draftColor, courierId: draftCourierId, weekStart, orderIds: draftOrderIds }) })
      if (!response.ok) return
      setIsDraftOpen(false); setDraftName(''); setDraftOrderIds([]); await load()
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
  const moveStop = (index: number, direction: -1 | 1) => {
    if (!selectedRoute) return
    const next = [...selectedRoute.stops]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRoutes((current) => current.map((route) => route.id === selectedRoute.id ? { ...route, stops: next.map((stop, position) => ({ ...stop, position })) } : route))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 gap-3">
        <SecondaryResourceRail ariaLabel={labels.title} items={railItems} selectedId={selectedRoute?.id ?? null} expandedId={expandedRouteId} onSelect={setSelectedRouteId} onToggle={(id) => setExpandedRouteId((current) => current === id ? null : id)} emptyLabel={labels.empty} renderExpanded={(item) => <div className="text-xs text-muted-foreground">{routes.find((route) => route.id === item.id)?.stops.length ?? 0} {labels.orders}</div>} />
        <section className="min-w-0 flex-1 space-y-3 overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><RouteIcon className="size-5" /><h1 className="text-lg font-semibold">{labels.title}</h1></div>
            <Button type="button" size="sm" onClick={() => setIsDraftOpen((current) => !current)}><Plus className="mr-1 size-4" />{labels.create}</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-2 py-1">
            <Button variant="ghost" size="sm" onClick={() => shiftDay(-1)}><ArrowLeft className="mr-1 size-4" />{labels.previous}</Button>
            <div className="flex items-center gap-2 text-xs"><Input type="date" value={selectedDayKey} onChange={(event) => { const next = new Date(`${event.target.value}T00:00:00`); setSelectedDay(next); setWeekStart(localDateValue(mondayOf(next))) }} className="h-8 w-[145px]" /><span>{weekStart}</span></div>
            <Button variant="ghost" size="sm" onClick={() => shiftDay(1)}>{labels.next}<ArrowRight className="ml-1 size-4" /></Button>
          </div>
          {isDraftOpen ? <div className="grid gap-2 bg-card p-3 sm:grid-cols-[1fr_180px_180px_auto]">
            <div><Label htmlFor="route-name">{labels.name}</Label><Input id="route-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /></div>
            <div><Label htmlFor="route-courier">{labels.courier}</Label><Select value={draftCourierId} onValueChange={setDraftCourierId}><SelectTrigger id="route-courier"><SelectValue placeholder={labels.courier} /></SelectTrigger><SelectContent>{couriers.map((courier) => <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isUzbek ? 'Rang' : 'Цвет'}</Label><div className="flex h-10 items-center gap-1">{COLORS.map((color) => <button key={color} type="button" aria-label={color} onClick={() => setDraftColor(color)} className="size-6" style={{ backgroundColor: color, outline: draftColor === color ? '2px solid var(--ring)' : undefined, outlineOffset: 2 }} />)}</div></div>
            <Button className="self-end" type="button" onClick={() => void saveDraft()} disabled={!draftName.trim() || !draftCourierId || isSaving}><Save className="mr-1 size-4" />{labels.save}</Button>
          </div> : null}
          <div className="relative min-h-[330px] bg-[#efe4cd] p-3">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, rgba(37,30,18,.12) 1px, transparent 1px), linear-gradient(rgba(37,30,18,.12) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            <div className="relative flex min-h-[300px] flex-wrap content-start gap-2"><MapPinned className="absolute right-3 top-3 size-5 text-[#71624b]" />{dayOrders.length ? dayOrders.map((order, index) => <div key={order.id} title={order.deliveryAddress} className="flex size-11 items-center justify-center bg-card text-xs font-semibold" style={{ borderBottom: `4px solid ${selectedRoute?.color ?? COLORS[index % COLORS.length]}` }}>{initials(order.customer.name)}</div>) : <p className="m-auto text-sm text-[#71624b]">{labels.noOrders}</p>}</div>
          </div>
          {selectedRoute ? <div className="space-y-1 bg-card p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="size-3" style={{ backgroundColor: selectedRoute.color }} /><span className="font-medium">{selectedRoute.name}</span><span className="text-xs text-muted-foreground">{selectedRoute.courier.name}</span></div><Button variant="ghost" size="sm" onClick={() => void saveSelectedRoute()} disabled={isSaving}><Save className="mr-1 size-4" />{labels.save}</Button></div>{selectedRoute.stops.map((stop, index) => <div key={stop.id} className="flex items-center gap-2 bg-muted/30 px-2 py-1 text-sm"><span className="w-5 text-xs text-muted-foreground">{index + 1}</span><span className="size-7 bg-background text-center text-xs leading-7">{initials(stop.order.customer.name)}</span><span className="min-w-0 flex-1 truncate">#{stop.order.orderNumber} {stop.order.customer.name}</span><Button variant="ghost" size="icon" className="size-7" onClick={() => moveStop(index, -1)} disabled={index === 0}><ChevronUp className="size-4" /></Button><Button variant="ghost" size="icon" className="size-7" onClick={() => moveStop(index, 1)} disabled={index === selectedRoute.stops.length - 1}><ChevronDown className="size-4" /></Button></div>)}</div> : null}
        </section>
      </div>
      <ResourceLocalActionBar labels={{ back: labels.back, clear: isUzbek ? 'Tozalash' : 'Очистить', cancel: isUzbek ? 'Bekor qilish' : 'Отмена', confirm: isUzbek ? 'Tasdiqlash' : 'Подтвердить', save: labels.save }} hasDraft={Boolean(selectedRoute) || isDraftOpen} canClear={draftOrderIds.length > 0} onBack={() => setIsDraftOpen(false)} onClear={() => setDraftOrderIds([])} onCancel={() => setIsDraftOpen(false)} onConfirm={() => void saveSelectedRoute()} onSave={() => void saveSelectedRoute()} />
    </div>
  )
}
