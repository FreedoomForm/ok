'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Clock3, Loader2, LogOut, MapPin, Package, ReceiptText, RefreshCw, Salad, ShieldCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SiteClientNav, SitePageSurface, SitePanel, SitePublicHeader } from '@/components/site/SiteScaffold'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { makeClientSiteHref } from '@/lib/site-urls'
import type { DateRange } from 'react-day-picker'

type CustomerProfile = {
  id: string
  name: string
  phone: string
  balance: number
  address: string
  calories: number
  autoOrdersEnabled: boolean
  googleMapsLink?: string
  deliveryDays?: Partial<Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', boolean>>
}

type Order = {
  id: string
  orderStatus: string
  orderNumber?: number
  calories: number
  deliveryTime?: string | null
  deliveryDate?: string | null
}

type TodayMenuResponse = {
  menuNumber: number
  source: 'set' | 'default'
  setName: string | null
  dishes: Array<{
    id: number
    name: string
    mealType: string
    imageUrl: string
  }>
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_DELIVERY: 'In delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  PAUSED: 'Paused',
  CANCELED: 'Canceled',
  CANCELLED: 'Canceled',
}

const ORDER_STATUS_TONES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_DELIVERY: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  PAUSED: 'bg-slate-200 text-slate-700',
  CANCELED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
}

function normalizeOrderStatus(status: string) {
  return ORDER_STATUS_LABELS[status] || status || 'Unknown'
}

export default function ClientHomePage({ params }: { params: { subdomain: string } }) {
  const router = useRouter()
  const { site, isLoading: siteLoading } = useSiteConfig(params.subdomain)
  const { language } = useLanguage()

  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    from.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return { from, to: today }
  })
  const [todayMenu, setTodayMenu] = useState<TodayMenuResponse | null>(null)
  const [googleMapsLink, setGoogleMapsLink] = useState('')
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [isTogglingPlan, setIsTogglingPlan] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const didInitialRangeFetchRef = useRef(false)

  const dateLocale = useMemo(() => (language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'), [language])
  const calendarUiText = useMemo(() => {
    if (language === 'ru') {
      return { calendar: 'Календарь', today: 'Сегодня', thisWeek: 'Эта неделя', thisMonth: 'Этот месяц', clearRange: 'Сбросить', allTime: 'За все время' }
    }
    if (language === 'uz') {
      return { calendar: 'Kalendar', today: 'Bugun', thisWeek: 'Shu hafta', thisMonth: 'Shu oy', clearRange: 'Tozalash', allTime: 'Barcha vaqt' }
    }
    return { calendar: 'Calendar', today: 'Today', thisWeek: 'This week', thisMonth: 'This month', clearRange: 'Clear', allTime: 'All time' }
  }, [language])

  const getLocalIsoDate = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const loadDashboardData = useCallback(
    async (background = false) => {
      if (background) setIsRefreshing(true)
      else setIsLoading(true)

      try {
        const customerToken = localStorage.getItem('customerToken')
        const authHeaders = customerToken ? { Authorization: `Bearer ${customerToken}` } : undefined

        const ordersParams = new URLSearchParams()
        if (dateRange?.from) {
          ordersParams.set('from', getLocalIsoDate(dateRange.from))
          ordersParams.set('to', getLocalIsoDate(dateRange.to ?? dateRange.from))
        }

        const [profileRes, ordersRes, menuRes] = await Promise.all([
          fetch('/api/customers/profile', { headers: authHeaders }),
          fetch(`/api/customers/orders${ordersParams.size ? `?${ordersParams.toString()}` : ''}`, { headers: authHeaders }),
          fetch('/api/customers/today-menu', { headers: authHeaders }),
        ])

        if (!profileRes.ok) {
          throw new Error('Unauthorized')
        }

        const profileJson = await profileRes.json()
        const ordersJson = ordersRes.ok ? await ordersRes.json() : {}
        const menuJson = menuRes.ok ? await menuRes.json() : null

        const profileData = profileJson.data ?? profileJson
        const ordersData = ordersJson.data ?? ordersJson
        const menuData = menuJson ? (menuJson.data ?? menuJson) : null

        setProfile(profileData)
        setGoogleMapsLink(profileData.googleMapsLink || '')
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setTodayMenu(menuData)
        setLastRefreshedAt(new Date())
      } catch {
        toast.error('Please login again.')
        localStorage.removeItem('customerToken')
        localStorage.removeItem('customerInfo')
        router.push(makeClientSiteHref(params.subdomain, '/login'))
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [dateRange, params.subdomain, router]
  )

  useEffect(() => {
    if (siteLoading) return
    void loadDashboardData()
  }, [loadDashboardData, siteLoading])

  useEffect(() => {
    if (siteLoading) return
    if (!didInitialRangeFetchRef.current) {
      didInitialRangeFetchRef.current = true
      return
    }

    void loadDashboardData(true)
  }, [dateRange, loadDashboardData, siteLoading])

  const activeOrder = useMemo(() => {
    return orders.find((order) => !['DELIVERED', 'FAILED', 'CANCELED', 'CANCELLED', 'PAUSED'].includes(order.orderStatus)) || null
  }, [orders])

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.orderStatus === 'DELIVERED').length,
    [orders]
  )

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.orderStatus === 'PENDING' || order.orderStatus === 'IN_DELIVERY').length,
    [orders]
  )

  const completionRate = useMemo(() => {
    if (orders.length === 0) return 0
    return Math.round((deliveredOrders / orders.length) * 100)
  }, [deliveredOrders, orders.length])

  const activeDeliveryDays = useMemo(() => {
    if (!profile?.deliveryDays) return 0
    return Object.values(profile.deliveryDays).filter(Boolean).length
  }, [profile?.deliveryDays])

  const deliveryDayLabels = useMemo(() => {
    if (!profile?.deliveryDays) return []
    const dayMap: Array<[keyof NonNullable<CustomerProfile['deliveryDays']>, string]> = [
      ['monday', 'Mon'],
      ['tuesday', 'Tue'],
      ['wednesday', 'Wed'],
      ['thursday', 'Thu'],
      ['friday', 'Fri'],
      ['saturday', 'Sat'],
      ['sunday', 'Sun'],
    ]

    return dayMap
      .filter(([day]) => Boolean(profile.deliveryDays?.[day]))
      .map(([, label]) => label)
  }, [profile?.deliveryDays])

  const currentOrderTone = activeOrder ? ORDER_STATUS_TONES[activeOrder.orderStatus] || 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'

  const lastRefreshLabel = useMemo(
    () =>
      lastRefreshedAt
        ? lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Not synced yet',
    [lastRefreshedAt]
  )

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    localStorage.removeItem('customerInfo')
    fetch('/api/customers/auth/logout', { method: 'POST' }).catch(() => {})
    router.push(makeClientSiteHref(params.subdomain, '/login'))
  }

  const handleSaveLocation = async () => {
    const customerToken = localStorage.getItem('customerToken')

    if (!googleMapsLink.trim()) {
      toast.error('Please paste Google Maps link or coordinates')
      return
    }

    setIsSavingLocation(true)
    try {
      const response = await fetch('/api/customers/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({ googleMapsLink: googleMapsLink.trim() }),
      })

      const json = await response.json().catch(() => ({}))
      const data = json.data ?? json
      const errorData = json.error ?? null
      if (!response.ok) {
        throw new Error(typeof errorData === 'object' && errorData?.message ? errorData.message : (data?.error || 'Failed to update location'))
      }

      setProfile(data)
      setGoogleMapsLink(data.googleMapsLink || googleMapsLink)
      toast.success('Location saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location')
    } finally {
      setIsSavingLocation(false)
    }
  }

  const handleTogglePlan = async (nextActive: boolean) => {
    const customerToken = localStorage.getItem('customerToken')
    if (!profile) return

    setIsTogglingPlan(true)
    try {
      const response = await fetch('/api/customers/plan', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({ active: nextActive }),
      })

      const json = await response.json().catch(() => ({}))
      const data = json.data ?? json
      const errorData = json.error ?? null
      if (!response.ok) {
        throw new Error(typeof errorData === 'object' && errorData?.message ? errorData.message : (data?.error || 'Failed to update plan status'))
      }

      setProfile((prev) => (prev ? { ...prev, autoOrdersEnabled: Boolean(data?.customer?.autoOrdersEnabled) } : prev))
      toast.success(nextActive ? 'Plan activated' : 'Plan deactivated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan status')
    } finally {
      setIsTogglingPlan(false)
    }
  }

  if (siteLoading || isLoading || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <SitePageSurface site={site}>
      <SitePublicHeader site={site} />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
 <div className="inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium" style={{ color: 'var(--site-accent)' }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Client dashboard
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {profile.name}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
              Phone: {profile.phone}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
              Need full records?{' '}
              <Link href={makeClientSiteHref(params.subdomain, '/history')} className="underline">
                Open order history
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SiteClientNav subdomain={params.subdomain} currentPath={makeClientSiteHref(params.subdomain, '/client')} />
            <CalendarRangeSelector
              value={dateRange}
              onChange={setDateRange}
              uiText={calendarUiText}
              locale={dateLocale}
              className="min-w-[220px]"
            />
            <Button
              variant="outline"
              onClick={() => void loadDashboardData(true)}
              className="gap-2 rounded-md"
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2 rounded-md">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SitePanel className="rounded-md p-4">
            <p className="text-xs" style={{ color: 'var(--site-muted)' }}>Balance</p>
            <p className="mt-2 text-2xl font-semibold">{(profile.balance || 0).toLocaleString()} UZS</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>Active orders</p>
              <Package className="h-4 w-4" style={{ color: 'var(--site-accent)' }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{pendingOrders}</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>Delivered</p>
              <ReceiptText className="h-4 w-4" style={{ color: 'var(--site-accent)' }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{deliveredOrders}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>Completion rate: {completionRate}%</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>Plan mode</p>
              <Clock3 className="h-4 w-4" style={{ color: 'var(--site-accent)' }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{profile.autoOrdersEnabled ? 'Active' : 'Paused'}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
              Delivery days: {activeDeliveryDays || 'Not configured'}
            </p>
          </SitePanel>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
 <span className="rounded-md px-3 py-1" style={{ }}>
            Last sync: {lastRefreshLabel}
          </span>
 <span className="rounded-md px-3 py-1" style={{ }}>
            Total orders tracked: {orders.length}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <SitePanel className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Account snapshot</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
                  Balance, plan status, and current delivery information in one place.
                </p>
              </div>
 <div className="rounded-md px-4 py-3 text-right" style={{ backgroundColor: 'var(--site-panel)' }}>
                <p className="text-xs" style={{ color: 'var(--site-muted)' }}>Calories target</p>
                <p className="mt-2 text-2xl font-semibold">{profile.calories || 0}</p>
              </div>
            </div>

 <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--site-panel)' }}>
              <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
                <span>Delivery consistency</span>
                <span>{completionRate}%</span>
              </div>
              <div className="mt-3 h-2 rounded-md bg-white/70">
                <div
                  className="h-2 rounded-md"
                  style={{
                    width: `${completionRate}%`,
                    backgroundColor: 'var(--site-accent)',
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
                <span>Delivered: {deliveredOrders}</span>
                <span>Active: {pendingOrders}</span>
                <span>Queue size: {orders.length}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
 <div className="rounded-md p-4" style={{ backgroundColor: 'var(--site-panel)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>Client Balance</h3>
                    <p className="mt-1 text-3xl font-semibold">{(profile.balance || 0).toLocaleString()} UZS</p>
                  </div>
                  <Wallet className="h-5 w-5" style={{ color: 'var(--site-accent)' }} />
                </div>
              </div>

 <div className="rounded-md p-4" style={{ backgroundColor: 'var(--site-panel)' }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>Current Order</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md px-3 text-xs"
                    onClick={() => router.push(makeClientSiteHref(params.subdomain, '/history'))}
                  >
                    History
                  </Button>
                </div>
                {activeOrder ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      Status:{' '}
                      <strong className={`inline-flex rounded-md px-2 py-0.5 text-xs ${currentOrderTone}`}>
                        {normalizeOrderStatus(activeOrder.orderStatus)}
                      </strong>
                    </p>
                    <p>Order: #{activeOrder.orderNumber || '-'}</p>
                    <p>Calories: {activeOrder.calories}</p>
                    <p>Time: {activeOrder.deliveryTime || 'Not set'}</p>
                    <p>Date: {activeOrder.deliveryDate ? new Date(activeOrder.deliveryDate).toLocaleDateString() : 'Not set'}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm" style={{ color: 'var(--site-muted)' }}>No active order right now.</p>
                )}
              </div>
            </div>
          </SitePanel>

          <SitePanel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>Plan Status</h2>
                <p className="mt-1 text-lg font-semibold">
                  {profile.autoOrdersEnabled ? 'Active' : 'Inactive'}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
                  When inactive, future auto-orders will be paused and won&apos;t be delivered.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {deliveryDayLabels.length > 0 ? (
                    deliveryDayLabels.map((day) => (
                      <span
                        key={day}
 className="inline-flex rounded-md px-2.5 py-1 text-[11px] font-medium"
 style={{ backgroundColor: 'var(--site-panel)' }}
                      >
                        {day}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--site-muted)' }}>
                      Delivery days are not configured yet.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={profile.autoOrdersEnabled}
                  onCheckedChange={(checked) => void handleTogglePlan(Boolean(checked))}
                  disabled={isTogglingPlan}
                />
              </div>
            </div>
            {isTogglingPlan && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--site-muted)' }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating plan status...
              </p>
            )}
          </SitePanel>
        </div>

        <SitePanel>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">Today Menu</h2>
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>
                Day #{todayMenu?.menuNumber || '-'}
                {todayMenu?.source === 'set' && todayMenu.setName ? ` - Set: ${todayMenu.setName}` : ''}
              </p>
            </div>
          </div>

          {todayMenu?.dishes?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayMenu.dishes.map((dish) => (
                <div
                  key={`${dish.id}-${dish.mealType}`}
 className="rounded-md p-3"
 style={{ backgroundColor: 'var(--site-bg)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{dish.mealType}</p>
                      <p className="mt-1 font-medium">{dish.name}</p>
                    </div>
                    <Salad className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--site-accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--site-muted)' }}>Menu is not available yet.</p>
          )}
        </SitePanel>

        <SitePanel>
          <h2 className="text-xl font-semibold">Profile</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
            Paste a Google Maps link or coordinates to save your location.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="mapsLink" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Google Maps Link
              </Label>
              <Input
                id="mapsLink"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="https://maps.google.com/?q=41.311081,69.240562"
              />
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>
                Current address: {profile.address || 'Not set'}
              </p>
            </div>

            {googleMapsLink.trim() ? (
              <Button variant="outline" className="self-end rounded-md" asChild>
                <a href={googleMapsLink.trim()} target="_blank" rel="noreferrer">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Open map
                </a>
              </Button>
            ) : (
              <Button variant="outline" className="self-end rounded-md" disabled>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Open map
              </Button>
            )}
            <Button onClick={handleSaveLocation} disabled={isSavingLocation} className="self-end rounded-md">
              {isSavingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save location'}
            </Button>
          </div>
        </SitePanel>
      </main>
    </SitePageSurface>
  )
}
