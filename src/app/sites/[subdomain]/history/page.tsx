'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock3, Loader2, ReceiptText, Search, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SiteClientNav, SitePageSurface, SitePanel, SitePublicHeader } from '@/components/site/SiteScaffold'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { makeClientSiteHref } from '@/lib/site-urls'
import type { DateRange } from 'react-day-picker'

type HistoryOrder = {
  id: string
  orderNumber?: number
  orderStatus: string
  calories: number
  paymentStatus: string
  createdAt: string
  deliveryDate?: string
}

export default function ClientHistoryPage({ params }: { params: { subdomain: string } }) {
  const router = useRouter()
  const { site, isLoading: siteLoading } = useSiteConfig(params.subdomain)
  const { language } = useLanguage()

  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    from.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return { from, to: today }
  })
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'FAILED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDirection, setSortDirection] = useState<'LATEST' | 'OLDEST'>('LATEST')

  const dateLocale = useMemo(() => (language === 'uz' ? 'uz-UZ' : 'ru-RU'), [language])
  const calendarUiText = useMemo(() => {
    if (language === 'uz') {
      return { calendar: 'Kalendar', today: 'Bugun', thisWeek: 'Shu hafta', thisMonth: 'Shu oy', clearRange: 'Tozalash', allTime: 'Barcha vaqt' }
    }
    return { calendar: 'Календарь', today: 'Сегодня', thisWeek: 'Эта неделя', thisMonth: 'Этот месяц', clearRange: 'Сбросить', allTime: 'За все время' }
  }, [language])
  const uiText = useMemo(() => language === 'uz' ? {
    records: 'Mijoz yozuvlari', title: 'Buyurtmalar tarixi', back: 'Mijoz sahifasiga', total: 'Jami buyurtmalar', delivered: 'Yetkazilgan', active: 'Faol', paid: 'To‘langan', failed: 'Muvaffaqiyatsiz', all: 'Barchasi', newest: 'Yangilari', oldest: 'Eskilari', showing: 'ta buyurtmadan', firstNewest: 'Yangisidan boshlab', firstOldest: 'Eskisidan boshlab', search: 'Buyurtma raqami, to‘lov yoki holat bo‘yicha qidirish...', clear: 'Tozalash', noMatch: 'Joriy filtrlarga mos buyurtmalar topilmadi.', noHistory: 'Hali buyurtmalar tarixi yo‘q.', order: 'Buyurtma', calories: 'Kaloriya', payment: 'To‘lov', statuses: { DELIVERED: 'Yetkazilgan', IN_DELIVERY: 'Yetkazilmoqda', PENDING: 'Kutilmoqda', PAUSED: 'To‘xtatilgan', FAILED: 'Muvaffaqiyatsiz' }
  } : {
    records: 'Записи клиента', title: 'История заказов', back: 'Назад к клиенту', total: 'Всего заказов', delivered: 'Доставлено', active: 'Активные', paid: 'Оплачено', failed: 'Не выполнено', all: 'Все', newest: 'Сначала новые', oldest: 'Сначала старые', showing: 'заказов из', firstNewest: 'сначала новые', firstOldest: 'сначала старые', search: 'Поиск по номеру заказа, оплате или статусу...', clear: 'Очистить', noMatch: 'Нет заказов, соответствующих текущим фильтрам.', noHistory: 'История заказов пока пуста.', order: 'Заказ', calories: 'Калории', payment: 'Оплата', statuses: { DELIVERED: 'Доставлено', IN_DELIVERY: 'В пути', PENDING: 'Ожидает', PAUSED: 'Приостановлен', FAILED: 'Не выполнен' }
  }, [language])

  const getLocalIsoDate = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  useEffect(() => {
    if (siteLoading) return

    const load = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem('customerToken')
        const queryParams = new URLSearchParams()
        if (dateRange?.from) {
          queryParams.set('from', getLocalIsoDate(dateRange.from))
          queryParams.set('to', getLocalIsoDate(dateRange.to ?? dateRange.from))
        }
        const url = `/api/customers/orders${queryParams.size ? `?${queryParams.toString()}` : ''}`
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          throw new Error('Unable to load order history')
        }

        const data = await response.json()
        setOrders(Array.isArray(data) ? data : [])
      } catch {
        localStorage.removeItem('customerToken')
        localStorage.removeItem('customerInfo')
        router.push(makeClientSiteHref(params.subdomain, '/login'))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [dateRange, params.subdomain, router, siteLoading])

  const deliveredCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'DELIVERED').length,
    [orders]
  )

  const activeCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'PENDING' || order.orderStatus === 'IN_DELIVERY').length,
    [orders]
  )

  const failedCount = useMemo(
    () => orders.filter((order) => order.orderStatus === 'FAILED' || order.orderStatus === 'CANCELED' || order.orderStatus === 'CANCELLED').length,
    [orders]
  )

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const aDate = new Date(a.deliveryDate || a.createdAt).getTime()
        const bDate = new Date(b.deliveryDate || b.createdAt).getTime()
        return sortDirection === 'LATEST' ? bDate - aDate : aDate - bDate
      }),
    [orders, sortDirection]
  )

  const paidCount = useMemo(
    () => orders.filter((order) => order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID').length,
    [orders]
  )

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return sortedOrders.filter((order) => {
      const isActive = order.orderStatus === 'PENDING' || order.orderStatus === 'IN_DELIVERY' || order.orderStatus === 'PAUSED'
      const isFailed = order.orderStatus === 'FAILED' || order.orderStatus === 'CANCELED' || order.orderStatus === 'CANCELLED'

      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'DELIVERED' && order.orderStatus === 'DELIVERED') ||
        (statusFilter === 'FAILED' && isFailed)

      if (!statusMatch) return false
      if (!query) return true

      return (
        String(order.orderNumber || '').includes(query) ||
        order.orderStatus.toLowerCase().includes(query) ||
        order.paymentStatus.toLowerCase().includes(query)
      )
    })
  }, [searchTerm, sortedOrders, statusFilter])

  const getStatusLabel = (status: string) => {
    if (status === 'DELIVERED') return uiText.statuses.DELIVERED
    if (status === 'IN_DELIVERY') return uiText.statuses.IN_DELIVERY
    if (status === 'PENDING') return uiText.statuses.PENDING
    if (status === 'PAUSED') return uiText.statuses.PAUSED
    if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') return uiText.statuses.FAILED
    return status
  }
  const hasActiveFilters = statusFilter !== 'ALL' || searchTerm.trim().length > 0 || sortDirection !== 'LATEST'

  const statusTone = (status: string) => {
    if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-700'
    if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') return 'bg-rose-100 text-rose-700'
    if (status === 'IN_DELIVERY') return 'bg-blue-100 text-blue-700'
    return 'bg-amber-100 text-amber-700'
  }

  if (siteLoading || isLoading || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <SitePageSurface site={site}>
      <SitePublicHeader site={site} />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--site-border)', color: 'var(--site-accent)' }}>
              <ReceiptText className="h-3.5 w-3.5" />
              {uiText.records}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{uiText.title}</h1>
          </div>
          <div className="flex gap-2">
            <SiteClientNav subdomain={params.subdomain} currentPath={makeClientSiteHref(params.subdomain, '/history')} />
            <CalendarRangeSelector
              value={dateRange}
              onChange={setDateRange}
              uiText={calendarUiText}
              locale={dateLocale}
              className="min-w-[220px]"
            />
            <Button variant="outline" className="rounded-md" onClick={() => router.push(makeClientSiteHref(params.subdomain, '/client'))}>
              {uiText.back}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SitePanel className="rounded-md p-4">
            <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{uiText.total}</p>
            <p className="mt-2 text-2xl font-semibold">{orders.length}</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{uiText.delivered}</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{deliveredCount}</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{uiText.active}</p>
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{uiText.paid}</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{paidCount}</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{uiText.failed}</p>
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{failedCount}</p>
          </SitePanel>
        </div>

        <SitePanel className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--site-muted)' }} />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={uiText.search}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL' as const, label: `${uiText.all} (${orders.length})` },
                { id: 'ACTIVE' as const, label: `${uiText.active} (${activeCount})` },
                { id: 'DELIVERED' as const, label: `${uiText.delivered} (${deliveredCount})` },
                { id: 'FAILED' as const, label: `${uiText.failed} (${failedCount})` },
              ].map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  type="button"
                  variant={statusFilter === option.id ? 'default' : 'outline'}
                  className="rounded-md"
                  onClick={() => setStatusFilter(option.id)}
                >
                  {option.label}
                </Button>
              ))}
              <Button
                size="sm"
                type="button"
                variant={sortDirection === 'LATEST' ? 'default' : 'outline'}
                className="rounded-md"
                onClick={() => setSortDirection('LATEST')}
              >
                {uiText.newest}
              </Button>
              <Button
                size="sm"
                type="button"
                variant={sortDirection === 'OLDEST' ? 'default' : 'outline'}
                className="rounded-md"
                onClick={() => setSortDirection('OLDEST')}
              >
                {uiText.oldest}
              </Button>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setSearchTerm('')
                    setSortDirection('LATEST')
                  }}
                >
                  {uiText.clear}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--site-muted)' }}>
            {language === 'uz' ? `${filteredOrders.length} ${uiText.showing} ${orders.length} · ${sortDirection === 'LATEST' ? uiText.firstNewest : uiText.firstOldest}` : `Показано ${filteredOrders.length} ${uiText.showing} ${orders.length} · ${sortDirection === 'LATEST' ? uiText.firstNewest : uiText.firstOldest}`}
          </p>
        </SitePanel>

        <SitePanel>
          {filteredOrders.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center" style={{ borderColor: 'var(--site-border)' }}>
              <AlertCircle className="mx-auto h-5 w-5" style={{ color: 'var(--site-muted)' }} />
              <p className="mt-3 text-sm" style={{ color: 'var(--site-muted)' }}>
                {searchTerm || statusFilter !== 'ALL' ? uiText.noMatch : uiText.noHistory}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order, index) => (
                <div
                  key={order.id}
                  className="rounded-md border p-4"
                  style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--site-muted)' }}>
                        {uiText.order} №{order.orderNumber || index + 1}
                      </p>
                      <p className="mt-2 text-sm">
                        {uiText.calories}: <strong>{order.calories}</strong>
                      </p>
                      <p className="mt-1 text-sm">
                        {uiText.payment}: <strong>{order.paymentStatus}</strong>
                      </p>
                    </div>
                    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${statusTone(order.orderStatus)}`}>
                      {getStatusLabel(order.orderStatus)}
                    </span>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--site-muted)' }}>
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(order.deliveryDate || order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SitePanel>
      </main>
    </SitePageSurface>
  )
}



