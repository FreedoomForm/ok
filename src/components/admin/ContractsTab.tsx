'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Loader2, Plus, Power, PowerOff, Trash2, RotateCcw } from 'lucide-react'

import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { ColorSquarePalette, RESOURCE_COLOR_PALETTE } from '@/components/admin/dashboard/shared/ColorSquarePalette'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'

interface ContractPeriod {
  id: string
  courierId: string | null
  startDate: string
  endDate: string
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  paid: boolean
  autoRenew: boolean
  color?: string | null
  enabledWeekdays: unknown
  disabledDates: unknown
  courier?: { id: string; name: string } | null
}

interface CourierOption {
  id: string
  name: string
  isActive: boolean
}

interface CustomerOption {
  id: string
  name: string
  isActive: boolean
}

interface ContractsTabProps {
  showDeleted?: boolean
  searchTerm?: string
  universalCreate?: boolean
  onUniversalCreateHandled?: () => void
  selectedIds?: readonly string[]
  onSelectionChange?: (ids: readonly string[]) => void
  universalEdit?: boolean
  onUniversalEditHandled?: () => void
}

interface Contract {
  id: string
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  paid: boolean
  autoRenew: boolean
  customer: { id: string; name: string; phone: string; isActive: boolean }
  courier: { id: string; name: string; phone: string; isActive: boolean } | null
  periods: ContractPeriod[]
}

function dateLabel(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale)
}

export function ContractsTab({ showDeleted = false, searchTerm = '', universalCreate = false, onUniversalCreateHandled, selectedIds = [], onSelectionChange, universalEdit = false, onUniversalEditHandled }: ContractsTabProps) {
  const { language } = useLanguage()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [couriers, setCouriers] = useState<CourierOption[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [isMutating, setIsMutating] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSelectedElementsOpen, setIsSelectedElementsOpen] = useState(false)
  const [createCustomerId, setCreateCustomerId] = useState('')
  const [createCourierId, setCreateCourierId] = useState('')
  const [createStartDate, setCreateStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [createEndDate, setCreateEndDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10) })
  const [createColor, setCreateColor] = useState<string>(RESOURCE_COLOR_PALETTE[0])
  const [createAutoRenew, setCreateAutoRenew] = useState(false)
  const [createPaid, setCreatePaid] = useState(false)
  const locale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const text = language === 'ru'
      ? { title: 'Контракты', empty: 'Контрактов пока нет', loading: 'Загрузка', paid: 'Оплачен', unpaid: 'Не оплачен', auto: 'Автопродление', disabled: 'Отключен', create: 'Создать', customer: 'Клиент', courier: 'Курьер', start: 'Начало', end: 'Конец', save: 'Сохранить' }
    : language === 'uz'
      ? { title: 'Shartnomalar', empty: 'Shartnomalar yo‘q', loading: 'Yuklanmoqda', paid: 'To‘langan', unpaid: 'To‘lanmagan', auto: 'Avtomatik uzaytirish', disabled: "O'chirilgan", create: 'Yaratish', customer: 'Mijoz', courier: 'Kuryer', start: 'Boshlanishi', end: 'Tugashi', save: 'Saqlash' }
      : { title: 'Contracts', empty: 'No contracts', loading: 'Loading', paid: 'Paid', unpaid: 'Unpaid', auto: 'Auto-renew', disabled: 'Disabled', create: 'Create', customer: 'Customer', courier: 'Courier', start: 'Start', end: 'End', save: 'Save' }

  const fetchContracts = useCallback(async () => {
    setIsLoading(true)
    try {
      const query = new URLSearchParams({ showDeleted: String(showDeleted) })
      if (searchTerm.trim()) query.set('search', searchTerm.trim().slice(0, 120))
      const response = await fetch(`/api/admin/contracts?${query.toString()}`)
      if (!response.ok) return
      const data = await response.json()
      setContracts(Array.isArray(data?.contracts) ? data.contracts : [])
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, showDeleted])

  const fetchCouriers = useCallback(async () => {
    const response = await fetch('/api/admin/couriers')
    if (!response.ok) return
    const data = await response.json().catch(() => [])
    setCouriers(Array.isArray(data) ? data : [])
  }, [])

  const fetchCustomers = useCallback(async () => {
    const response = await fetch('/api/admin/clients')
    if (!response.ok) return
    const data = await response.json().catch(() => [])
    setCustomers(Array.isArray(data) ? data.filter((customer): customer is CustomerOption => typeof customer?.id === 'string' && typeof customer?.name === 'string' && customer.isActive !== false) : [])
  }, [])

  const createContract = useCallback(async () => {
    if (!createCustomerId || !createStartDate || !createEndDate || isMutating) return
    setIsMutating(true)
    try {
      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: createCustomerId,
          courierId: createCourierId || null,
          autoRenew: createAutoRenew,
          paid: createPaid,
          period: {
            startDate: createStartDate,
            endDate: createEndDate,
            courierId: createCourierId || null,
            color: createColor,
            autoRenew: createAutoRenew,
            paid: createPaid,
            enabledWeekdays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            disabledDates: [],
          },
        }),
      })
      if (!response.ok) return
      setIsCreateOpen(false)
      await fetchContracts()
    } finally {
      setIsMutating(false)
    }
  }, [createAutoRenew, createColor, createCourierId, createCustomerId, createEndDate, createPaid, createStartDate, fetchContracts, isMutating])

  const updateContract = useCallback(async (id: string, payload: Record<string, unknown>) => {
    if (isMutating) return
    setIsMutating(true)
    try {
      const response = await fetch(`/api/admin/contracts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) return
      await fetchContracts()
    } finally {
      setIsMutating(false)
    }
  }, [fetchContracts, isMutating])

  useEffect(() => {
    void fetchContracts()
    void fetchCouriers()
    void fetchCustomers()
  }, [fetchContracts, fetchCouriers, fetchCustomers])

  useEffect(() => {
    if (!universalCreate || showDeleted) return
    setIsCreateOpen(true)
    onUniversalCreateHandled?.()
  }, [onUniversalCreateHandled, showDeleted, universalCreate])

  useEffect(() => {
    if (!universalEdit || showDeleted) return
    if (selectedIds.length > 1) setIsSelectedElementsOpen(true)
    else if (selectedIds[0]) setExpandedId(selectedIds[0])
    onUniversalEditHandled?.()
  }, [onUniversalEditHandled, selectedIds, showDeleted, universalEdit])

  return (
    <Card className="min-h-0 border-border/70">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" />{text.title}</CardTitle>
          <Button type="button" variant="ghost" size="icon" aria-label={text.create} title={text.create} disabled={showDeleted} onClick={() => setIsCreateOpen((current) => !current)}><Plus className="size-4" /></Button>
        </div>
        {isCreateOpen && !showDeleted ? (
          <div className="mt-3 grid gap-2 border-t border-border/50 pt-3 sm:grid-cols-2">
            <select value={createCustomerId} onChange={(event) => setCreateCustomerId(event.target.value)} aria-label={text.customer} className="h-9 rounded border border-border bg-background px-2 text-sm"><option value="">{text.customer}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
            <select value={createCourierId} onChange={(event) => setCreateCourierId(event.target.value)} aria-label={text.courier} className="h-9 rounded border border-border bg-background px-2 text-sm"><option value="">{text.courier}</option>{couriers.filter((courier) => courier.isActive).map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}</select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">{text.start}<Input type="date" value={createStartDate} onChange={(event) => setCreateStartDate(event.target.value)} className="h-9 text-sm" /></label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">{text.end}<Input type="date" value={createEndDate} onChange={(event) => setCreateEndDate(event.target.value)} className="h-9 text-sm" /></label>
            <div className="flex items-center gap-3 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={createAutoRenew} onChange={(event) => setCreateAutoRenew(event.target.checked)} />{text.auto}</label><label className="flex items-center gap-1"><input type="checkbox" checked={createPaid} onChange={(event) => setCreatePaid(event.target.checked)} />{text.paid}</label></div>
            <div className="flex items-center justify-between gap-2"><ColorSquarePalette value={createColor} onChange={setCreateColor} label={language === 'uz' ? 'Rang' : 'Цвет'} colors={RESOURCE_COLOR_PALETTE} /><Button type="button" disabled={isMutating || !createCustomerId} onClick={() => void createContract()}>{text.save}</Button></div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {isSelectedElementsOpen ? (
          <div data-reference-selected-elements="contracts" className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{language === 'uz' ? 'Tanlangan elementlar' : 'Выбранные элементы'}</h2>
              <Button type="button" variant="ghost" onClick={() => setIsSelectedElementsOpen(false)}>{language === 'uz' ? 'Orqaga' : 'Назад'}</Button>
            </div>
            <div className="divide-y border-y" role="list" aria-label={language === 'uz' ? 'Tanlangan shartnomalar' : 'Выбранные контракты'}>
              {contracts.filter((contract) => selectedIds.includes(contract.id)).map((contract) => (
                <div key={contract.id} role="listitem" className="flex min-h-12 items-center justify-between gap-3 py-2">
                  <span className="truncate text-sm font-medium">{contract.customer.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setIsSelectedElementsOpen(false); setExpandedId(contract.id) }}>{language === 'uz' ? 'Ochish' : 'Открыть'}</Button>
                </div>
              ))}
            </div>
          </div>
        ) : isLoading ? <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{text.loading}</div> : contracts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{text.empty}</p> : contracts.map((contract) => {
          const expanded = expandedId === contract.id
          const lastPeriod = contract.periods.at(-1)
          return (
            <div key={contract.id} data-reference-resource-row="contracts" data-resource-id={contract.id} className="border-b border-border/60 last:border-b-0">
              <div className="flex items-center gap-2 p-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(contract.id)}
                  onChange={(event) => {
                    const next = event.target.checked ? [...selectedIds, contract.id] : selectedIds.filter((id) => id !== contract.id)
                    onSelectionChange?.(next)
                  }}
                  aria-label={`${language === 'uz' ? 'Tanlash' : 'Выбрать'} ${contract.customer.name}`}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpandedId(expanded ? null : contract.id)}>
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{contract.customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{contract.courier?.name ?? '—'} · {lastPeriod ? `${dateLabel(lastPeriod.startDate, locale)} — ${dateLabel(lastPeriod.endDate, locale)}` : '—'}</p>
                </div>
                <Badge variant={contract.status === 'ENABLED' ? 'default' : 'outline'}>{contract.status === 'ENABLED' ? (contract.paid ? text.paid : text.unpaid) : text.disabled}</Badge>
                <Button type="button" variant="ghost" size="icon" className="size-7" disabled={isMutating} title={showDeleted ? (language === 'uz' ? 'Tiklash' : 'Восстановить') : (language === 'uz' ? 'Savatga yuborish' : 'В корзину')} aria-label={showDeleted ? (language === 'uz' ? 'Tiklash' : 'Восстановить') : (language === 'uz' ? 'Savatga yuborish' : 'В корзину')} onClick={() => void updateContract(contract.id, { status: showDeleted ? 'ENABLED' : 'DELETED' })}>{showDeleted ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}</Button>
              </div>
              {expanded ? (
                <div className="grid gap-3 border-t border-border/60 bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {contract.autoRenew ? <Badge variant="outline">{text.auto}</Badge> : null}
                      {contract.periods.map((period) => (
                        <Badge key={period.id} variant={period.status === 'ENABLED' ? 'secondary' : 'outline'}>
                          {dateLabel(period.startDate, locale)} — {dateLabel(period.endDate, locale)} · {period.courier?.name ?? contract.courier?.name ?? '—'}
                        </Badge>
                      ))}
                    </div>
                    {contract.periods.map((period, index) => {
                      const periodColor = period.color ?? RESOURCE_COLOR_PALETTE[index % RESOURCE_COLOR_PALETTE.length]
                      return <div key={period.id} className="border-l-2 pl-3 text-xs" style={{ borderColor: periodColor }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{dateLabel(period.startDate, locale)} — {dateLabel(period.endDate, locale)}</span>
                          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={isMutating} title={period.status === 'ENABLED' ? (language === 'uz' ? "O'chirish" : 'Отключить') : (language === 'uz' ? 'Yoqish' : 'Включить')} aria-label={period.status === 'ENABLED' ? (language === 'uz' ? "O'chirish" : 'Отключить') : (language === 'uz' ? 'Yoqish' : 'Включить')} onClick={() => void updateContract(contract.id, { period: { id: period.id, status: period.status === 'ENABLED' ? 'DISABLED' : 'ENABLED' } })}>{period.status === 'ENABLED' ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}</Button>
                          <Button type="button" variant={period.paid ? 'secondary' : 'ghost'} size="sm" className="h-7 rounded-sm px-2 text-[11px]" disabled={isMutating} onClick={() => void updateContract(contract.id, { period: { id: period.id, paid: !period.paid } })}>{period.paid ? text.paid : text.unpaid}</Button>
                          <ColorSquarePalette value={periodColor} onChange={(color) => void updateContract(contract.id, { period: { id: period.id, color } })} label={language === 'uz' ? 'Rang' : 'Цвет'} colors={RESOURCE_COLOR_PALETTE} />
                        </div>
                        <div className="mt-2 max-w-[260px]">
                          <Select value={period.courierId ?? 'none'} onValueChange={(courierId) => void updateContract(contract.id, { period: { id: period.id, courierId: courierId === 'none' ? null : courierId } })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder={language === 'uz' ? 'Kuryer' : 'Курьер'} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {couriers.filter((courier) => courier.isActive).map((courier) => <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="mt-1">{Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays.join(', ') : '—'}</p>
                        <p className="text-muted-foreground">{Array.isArray(period.disabledDates) && period.disabledDates.length > 0 ? period.disabledDates.join(', ') : '—'}</p>
                      </div>
                    })}
                  </div>
                  <ResourceCalendarPanel
                    resourceType="CONTRACT"
                    resourceId={contract.id}
                    compact
                    periodMarkers={contract.periods.map((period, index) => ({
                      id: period.id,
                      startDate: period.startDate,
                      endDate: period.endDate,
                      status: period.status,
                      color: period.color ?? RESOURCE_COLOR_PALETTE[index % RESOURCE_COLOR_PALETTE.length],
                      courierName: period.courier?.name ?? contract.courier?.name ?? null,
                    }))}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
