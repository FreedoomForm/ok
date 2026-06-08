'use client'

import type React from 'react'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Admin, Client, Order } from '@/components/admin/dashboard/types'
import { formatLatLng } from '@/lib/geo'

const MiniLocationPickerMap = dynamic(
  () =>
    import('@/components/admin/dashboard/shared/MiniLocationPickerMap').then(
      (mod) => mod.MiniLocationPickerMap
    ),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse border bg-muted/30" /> }
)

export type OrderFormData = {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  paymentStatus: string
  paymentMethod: string
  isPrepaid: boolean
  amountReceived: number | null
  selectedClientId: string
  latitude: number | null
  longitude: number | null
  courierId: string
  assignedSetId: string
}

export function OrderModal({
  open,
  onOpenChange,
  editingOrderId,
  setEditingOrderId,
  orderFormData,
  setOrderFormData,
  editingOrder,
  clients,
  couriers,
  availableSets,
  orderError,
  isCreatingOrder,
  onSubmit,
  onClientSelect,
  onAddressChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingOrderId: string | null
  setEditingOrderId: (next: string | null) => void
  orderFormData: OrderFormData
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>
  editingOrder: Order | null
  clients: Client[]
  couriers: Admin[]
  availableSets: any[]
  orderError: string
  isCreatingOrder: boolean
  onSubmit: (event: React.FormEvent | React.MouseEvent) => void | Promise<void>
  onClientSelect: (clientId: string) => void
  onAddressChange: (value: string) => void
}) {
  // Mobile-first: stack label + control on narrow screens; keep aligned 4-col layout on >=sm.
  const rowClass = 'grid gap-2 sm:grid-cols-4 sm:items-center'
  const labelClass = 'sm:text-right sm:whitespace-nowrap'
  const fieldSpanClass = 'sm:col-span-3'

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0)

  const matchedClient: Client | undefined = (() => {
    if (orderFormData.selectedClientId && orderFormData.selectedClientId !== 'manual') {
      return clients.find((c) => c.id === orderFormData.selectedClientId)
    }
    // Edit flow doesn't bind selectedClientId; fallback to phone match.
    const phone = (orderFormData.customerPhone || '').trim()
    if (!phone) return undefined
    return clients.find((c) => (c.phone || '').trim() === phone)
  })()

  const clientBalance = typeof matchedClient?.balance === 'number' ? matchedClient.balance : 0
  const dailyPrice = typeof matchedClient?.dailyPrice === 'number' ? matchedClient.dailyPrice : 0

  const isCashLike = orderFormData.paymentMethod === 'CASH' || orderFormData.paymentMethod === 'CARD'
  const draftAmountReceived =
    typeof orderFormData.amountReceived === 'number' && Number.isFinite(orderFormData.amountReceived)
      ? orderFormData.amountReceived
      : 0

  const orderPoint =
    typeof orderFormData.latitude === 'number' && typeof orderFormData.longitude === 'number'
      ? { lat: orderFormData.latitude, lng: orderFormData.longitude }
      : null

  const selectedSet = orderFormData.assignedSetId
    ? availableSets.find((s: any) => s?.id === orderFormData.assignedSetId)
    : null

  const groupOptions: Array<{ id: string; name: string; price: number | null }> = useMemo(() => {
    const groupsByDay = (selectedSet as any)?.calorieGroups ?? (selectedSet as any)?.groups
    if (!groupsByDay) return []

    const toGroupsArray = (value: any): any[] => {
      if (Array.isArray(value)) return value
      if (value && typeof value === 'object') return Object.values(value)
      return []
    }

    const parsePrice = (value: any): number | null => {
      const num = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(num) ? num : null
    }

    const mapOptions = (groups: any[]) => {
      const used = new Set<string>()
      return groups.map((g: any, index: number) => {
        const rawId = String(g?.id ?? g?.name ?? `group-${index + 1}`)
        const id = used.has(rawId) ? `${rawId}-${index + 1}` : rawId
        used.add(id)
        return {
          id,
          name: String(g?.name ?? '').trim() || String(index + 1),
          price: parsePrice(g?.price),
        }
      })
    }

    if (Array.isArray(groupsByDay)) {
      return mapOptions(groupsByDay)
    }

    if (typeof groupsByDay !== 'object') return []

    const dayKeys = Object.keys(groupsByDay)
      .filter((k) => /^\d+$/.test(k) && Number(k) > 0)
      .sort((a, b) => Number(a) - Number(b))
    const firstDayWithGroups = dayKeys.find((k) => toGroupsArray((groupsByDay as any)[k]).length > 0)

    if (firstDayWithGroups) {
      return mapOptions(toGroupsArray((groupsByDay as any)[firstDayWithGroups]))
    }

    const fallbackKey = Object.keys(groupsByDay).find((k) => toGroupsArray((groupsByDay as any)[k]).length > 0)
    return fallbackKey ? mapOptions(toGroupsArray((groupsByDay as any)[fallbackKey])) : []
  }, [selectedSet])

  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const selectedGroup = useMemo(
    () => groupOptions.find((g) => g.id === selectedGroupId) ?? null,
    [groupOptions, selectedGroupId]
  )

  const effectiveDailyPrice =
    typeof selectedGroup?.price === 'number' && Number.isFinite(selectedGroup.price)
      ? selectedGroup.price
      : dailyPrice
  const qty = Number.isFinite(orderFormData.quantity) && orderFormData.quantity > 0 ? orderFormData.quantity : 1
  const orderCost = effectiveDailyPrice * qty

  useEffect(() => {
    setSelectedGroupId('')
  }, [orderFormData.assignedSetId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingOrderId ? 'Редактировать Заказ' : 'Создать Новый Заказ'}</DialogTitle>
          <DialogDescription>
            {editingOrderId
              ? 'Измените данные заказа'
              : 'Заполните информацию о новом заказе. Вы можете выбрать клиента из списка для автозаполнения данных.'}
          </DialogDescription>
          {!editingOrderId && orderFormData.selectedClientId && orderFormData.selectedClientId !== 'manual' && (
            <div className="bg-green-50 border-0 rounded-lg p-2">
              <p className="text-xs text-green-800">✅ Данные клиента заполнены автоматически</p>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={onSubmit as any}>
            <div className="grid gap-3 py-2">
              <div className={rowClass}>
                <Label htmlFor="clientSelect" className={labelClass}>
                  Выбрать клиента
                </Label>
                <div className={fieldSpanClass}>
                  <Select value={orderFormData.selectedClientId} onValueChange={onClientSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите клиента из списка или введите данные вручную" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">-- Ввести данные вручную --</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">Выберите клиента для автозаполнения</p>
                </div>
              </div>

              {availableSets.length > 0 && (
                <div className={rowClass}>
                  <Label htmlFor="orderSet" className={labelClass}>
                    Сет
                  </Label>
                  <div className={fieldSpanClass}>
                    <Select
                      value={orderFormData.assignedSetId || 'none'}
                      onValueChange={(value) =>
                        setOrderFormData((prev) => ({ ...prev, assignedSetId: value === 'none' ? '' : value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите сет (опционально)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Не выбирать --</SelectItem>
                        {availableSets.map((set: any) => (
                          <SelectItem key={set.id} value={set.id}>
                            {set.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 mt-1">Если выбрать сет, он будет закреплён за клиентом</p>
                  </div>
                </div>
              )}

              <div className={rowClass}>
                <Label htmlFor="customerName" className={labelClass}>
                  Имя клиента
                  {orderFormData.selectedClientId && <span className="text-xs text-green-600 ml-1">✓</span>}
                </Label>
                <Input
                  id="customerName"
                  value={orderFormData.customerName}
                  onChange={(e) => setOrderFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                  className={`${fieldSpanClass} ${orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}`}
                  required
                />
              </div>

              <div className={rowClass}>
                <Label htmlFor="customerPhone" className={labelClass}>
                  Телефон клиента
                  {orderFormData.selectedClientId && <span className="text-xs text-green-600 ml-1">✓</span>}
                </Label>
                <div className={fieldSpanClass}>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="+998 XX XXX XX XX"
                    value={orderFormData.customerPhone}
                    onChange={(e) => setOrderFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    className={orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Формат: +998 XX XXX XX XX</p>
                </div>
              </div>

              <div className={rowClass}>
                <Label htmlFor="deliveryTime" className={labelClass}>
                  Время доставки
                </Label>
                <Input
                  id="deliveryTime"
                  type="time"
                  value={orderFormData.deliveryTime}
                  onChange={(e) => setOrderFormData((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                  className={fieldSpanClass}
                  required
                />
              </div>

              <div className={rowClass}>
                <Label htmlFor="quantity" className={labelClass}>
                  Количество
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={orderFormData.quantity}
                  onChange={(e) => setOrderFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) }))}
                  className={fieldSpanClass}
                  required
                />
              </div>
              {!orderFormData.assignedSetId ? null : groupOptions.length > 0 ? (
                <div className={rowClass}>
                  <Label className={labelClass}>Group</Label>
                  <div className={fieldSpanClass}>
                    <Select
                      value={selectedGroupId || 'none'}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setSelectedGroupId('')
                          return
                        }
                        setSelectedGroupId(value)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">--</SelectItem>
                        {groupOptions.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selectedGroup?.price != null ? `Price: ${formatCurrency(selectedGroup.price)}` : 'Price not set'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={rowClass}>
                  <Label htmlFor="calories" className={labelClass}>
                    Калории
                    {orderFormData.selectedClientId && <span className="text-xs text-green-600 ml-1">✓</span>}
                  </Label>
                  <div className={fieldSpanClass}>
                    <Select
                      value={String(orderFormData.calories)}
                      onValueChange={(value) =>
                        setOrderFormData((prev) => ({ ...prev, calories: Number.parseInt(value, 10) || 1200 }))
                      }
                    >
                      <SelectTrigger className={orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1200">1200 kcal</SelectItem>
                        <SelectItem value="1600">1600 kcal</SelectItem>
                        <SelectItem value="2000">2000 kcal</SelectItem>
                        <SelectItem value="2500">2500 kcal</SelectItem>
                        <SelectItem value="3000">3000 kcal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className={rowClass}>
                <Label htmlFor="paymentMethod" className={labelClass}>
                  Оплата
                </Label>
                <div className={fieldSpanClass}>
                  <Select
                    value={orderFormData.paymentMethod}
                    onValueChange={(value) => setOrderFormData((prev) => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isCashLike && (
                <div className={rowClass}>
                  <Label htmlFor="amountReceived" className={labelClass}>
                    Amount
                  </Label>
                  <div className={fieldSpanClass}>
                    <Input
                      id="amountReceived"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={orderFormData.amountReceived ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        const next = raw.trim() === '' ? null : Number(raw)
                        setOrderFormData((prev) => ({
                          ...prev,
                          amountReceived: typeof next === 'number' && Number.isFinite(next) ? next : null,
                        }))
                      }}
                      placeholder="0"
                    />
                    {matchedClient || selectedGroup ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Cost: {formatCurrency(orderCost)} ({formatCurrency(effectiveDailyPrice)} x {qty})
                        {matchedClient ? ` | Balance: ${formatCurrency(clientBalance)}` : ''}
                        {' | '}Received: {formatCurrency(draftAmountReceived)}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className={rowClass}>
                <Label htmlFor="specialFeatures" className={labelClass}>
                  Особенности
                  {orderFormData.selectedClientId && <span className="text-xs text-green-600 ml-1">✓</span>}
                </Label>
                <Input
                  id="specialFeatures"
                  value={orderFormData.specialFeatures}
                  onChange={(e) => setOrderFormData((prev) => ({ ...prev, specialFeatures: e.target.value }))}
                  className={`${fieldSpanClass} ${orderFormData.selectedClientId ? 'border-green-200 bg-green-50' : ''}`}
                  placeholder="Особые пожелания"
                />
              </div>

              <div className={rowClass}>
                <Label htmlFor="courier" className={labelClass}>
                  Курьер
                </Label>
                <div className={fieldSpanClass}>
                  <Select
                    value={orderFormData.courierId || '__auto__'}
                    onValueChange={(value) =>
                      setOrderFormData((prev) => ({ ...prev, courierId: value === '__auto__' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Automatic (if assigned to client)</SelectItem>
                      {couriers.map((courier) => (
                        <SelectItem key={courier.id} value={courier.id}>
                          {courier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="rounded-xl border-0 overflow-hidden bg-card">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Map
                    </span>
                    {orderPoint ? (
                      <span className="text-xs text-muted-foreground">
                        {orderPoint.lat.toFixed(5)}, {orderPoint.lng.toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Click map to pick a point
                      </span>
                    )}
                  </div>
                  <div className="p-3 border-b border-border">
                    <Input
                      value={orderFormData.deliveryAddress}
                      onChange={(e) => onAddressChange(e.target.value)}
                      placeholder="Google Maps link or coordinates (lat,lng)"
                      required
                    />
                  </div>
                  <div className="h-[190px] w-full">
                    <MiniLocationPickerMap
                      value={orderPoint}
                      onChange={(point) => {
                        // Persist coordinates into the address field so AdminDashboardPage can include them on submit.
                        onAddressChange(formatLatLng(point))
                      }}
                    />
                  </div>
                </div>
              </div>

              {orderError && (
                <div>
                  <Alert variant="destructive">
                    <AlertDescription>{orderError}</AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setOrderFormData((prev) => ({ ...prev, latitude: null, longitude: null }))
              setEditingOrderId(null)
            }}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isCreatingOrder} onClick={onSubmit as any}>
            {isCreatingOrder ? 'Сохранение...' : editingOrderId ? 'Сохранить изменения' : 'Создать заказ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

