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
import { SitePageSurface, SitePanel } from '@/components/site/SiteScaffold'
import { CustomerChatPanel } from '@/components/site/CustomerChatPanel'
import { RoleWorkspaceShell } from '@/components/site/RoleWorkspaceShell'
import type { UniversalCommand } from '@/components/admin/dashboard/shared/workspace-state'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { makeClientSiteHref } from '@/lib/site-urls'
import { clientOrderStatusLabel } from '@/lib/clients/order-status'
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

const ORDER_STATUS_TONES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_DELIVERY: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  PAUSED: 'bg-slate-200 text-slate-700',
  CANCELED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
}

export default function ClientHomePage({ params }: { params: { subdomain: string } }) {
  const router = useRouter()
  const { site, isLoading: siteLoading } = useSiteConfig(params.subdomain)
  const { language } = useLanguage()

  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [activeClientPage, setActiveClientPage] = useState<'chat' | 'orders' | 'settings'>('orders')
  const [customerToken, setCustomerToken] = useState<string | null>(null)
    useEffect(() => {
        setCustomerToken(localStorage.getItem('customerToken'))
    }, [])
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

  const dateLocale = useMemo(() => (language === 'ru' ? 'ru-RU' : 'uz-UZ'), [language])
  const clientUiText = useMemo(() => language === 'ru'
    ? { badge: 'Кабинет клиента', welcome: 'Добро пожаловать', phone: 'Телефон', needRecords: 'Нужны все записи?', openHistory: 'Открыть историю заказов', openMap: 'Открыть карту', saveLocation: 'Сохранить местоположение', refresh: 'Обновить', logout: 'Выйти', balance: 'Баланс', activeOrders: 'Активные заказы', delivered: 'Доставлено', completionRate: 'Процент выполнения', planMode: 'Режим плана', lastSync: 'Последняя синхронизация', accountSnapshot: 'Сводка аккаунта', mapsLink: 'Ссылка Google Maps', profile: 'Профиль', caloriesTarget: 'Целевой показатель калорий', deliveryConsistency: 'Стабильность доставки', totalOrders: 'Всего заказов', currentOrder: 'Текущий заказ', history: 'История', status: 'Статус', order: 'Заказ', calories: 'Калории', time: 'Время', date: 'Дата', noActiveOrder: 'Сейчас нет активного заказа.', planStatus: 'Статус плана', deliveryDaysMissing: 'Дни доставки пока не настроены.', updatingPlan: 'Обновление статуса плана...', todayMenu: 'Меню на сегодня', menuMissing: 'Меню пока недоступно', locationHint: 'Вставьте ссылку Google Maps или координаты, чтобы сохранить местоположение.', currentAddress: 'Текущий адрес', notSet: 'Не задано', activeState: 'Активен', pausedState: 'Приостановлен', inactiveState: 'Неактивен', notConfigured: 'Не настроено', loginAgain: 'Войдите снова.', pasteLocation: 'Вставьте ссылку Google Maps или координаты', invalidLocation: 'Некорректная ссылка Google Maps или координаты', failedLocation: 'Не удалось обновить местоположение', locationSaved: 'Местоположение сохранено', failedPlan: 'Не удалось обновить статус плана', planActivated: 'План активирован', planDeactivated: 'План приостановлен', clientBalance: 'Баланс клиента', accountDescription: 'Баланс, статус плана и текущая информация о доставке в одном месте.', inactivePlanDescription: 'При отключении будущие автозаказы будут приостановлены и не будут доставлены.', queueSize: 'Размер очереди', day: 'День', set: 'Набор' }
    : { badge: 'Mijoz paneli', welcome: 'Xush kelibsiz', phone: 'Telefon', needRecords: 'Barcha yozuvlar kerakmi?', openHistory: 'Buyurtmalar tarixini ochish', openMap: 'Xaritani ochish', saveLocation: 'Joylashuvni saqlash', refresh: 'Yangilash', logout: 'Chiqish', balance: 'Balans', activeOrders: 'Faol buyurtmalar', delivered: 'Yetkazildi', completionRate: 'Bajarilish foizi', planMode: 'Reja rejimi', lastSync: 'Oxirgi sinxronlash', accountSnapshot: 'Hisob qaydnomasi xulosasi', mapsLink: 'Google Maps havolasi', profile: 'Profil', caloriesTarget: 'Kalori maqsadi', deliveryConsistency: 'Yetkazib berish barqarorligi', totalOrders: 'Jami buyurtmalar', currentOrder: 'Joriy buyurtma', history: 'Tarix', status: 'Holat', order: 'Buyurtma', calories: 'Kaloriyalar', time: 'Vaqt', date: 'Sana', noActiveOrder: 'Hozir faol buyurtma yo‘q.', planStatus: 'Reja holati', deliveryDaysMissing: 'Yetkazib berish kunlari hali sozlanmagan.', updatingPlan: 'Reja holati yangilanmoqda...', todayMenu: 'Bugungi menyu', menuMissing: 'Menyu hali mavjud emas', locationHint: 'Joylashuvni saqlash uchun Google Maps havolasi yoki koordinatalarni kiriting.', currentAddress: 'Joriy manzil', notSet: 'Belgilanmagan', activeState: 'Faol', pausedState: 'To‘xtatilgan', inactiveState: 'Faol emas', notConfigured: 'Sozlanmagan', loginAgain: 'Qayta kiring.', pasteLocation: 'Google Maps havolasi yoki koordinatalarni kiriting', invalidLocation: 'Google Maps havolasi yoki koordinatalar noto‘g‘ri', failedLocation: 'Joylashuvni yangilab bo‘lmadi', locationSaved: 'Joylashuv saqlandi', failedPlan: 'Reja holatini yangilab bo‘lmadi', planActivated: 'Reja faollashtirildi', planDeactivated: 'Reja to‘xtatildi', clientBalance: 'Mijoz balansi', accountDescription: 'Balans, reja holati va joriy yetkazib berish maʼlumotlari bir joyda.', inactivePlanDescription: 'O‘chirilganda kelajakdagi avtomatik buyurtmalar to‘xtatiladi va yetkazib berilmaydi.', queueSize: 'Navbat hajmi', day: 'Kun', set: 'To‘plam' }
  , [language])
  const mealTypeLabels = useMemo(() => language === 'ru'
    ? { BREAKFAST: 'Завтрак', SECOND_BREAKFAST: 'Второй завтрак', LUNCH: 'Обед', SNACK: 'Перекус', DINNER: 'Ужин', SIXTH_MEAL: 'Шестой прием пищи' }
    : { BREAKFAST: 'Nonushta', SECOND_BREAKFAST: 'Ikkinchi nonushta', LUNCH: 'Tushlik', SNACK: 'Yengil tamaddi', DINNER: 'Kechki ovqat', SIXTH_MEAL: 'Oltinchi ovqat' }, [language])
  const calendarUiText = useMemo(() => {
    if (language === 'ru') {
      return { calendar: 'Календарь', today: 'Сегодня', thisWeek: 'Эта неделя', thisMonth: 'Этот месяц', clearRange: 'Сбросить', allTime: 'За все время' }
    }
    if (language === 'uz') {
      return { calendar: 'Kalendar', today: 'Bugun', thisWeek: 'Shu hafta', thisMonth: 'Shu oy', clearRange: 'Tozalash', allTime: 'Barcha vaqt' }
    }
    return { calendar: 'Календарь', today: 'Сегодня', thisWeek: 'Эта неделя', thisMonth: 'Этот месяц', clearRange: 'Сбросить', allTime: 'За все время' }
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
          throw new Error(clientUiText.loginAgain)
        }

        const profileData = await profileRes.json()
        const ordersData = ordersRes.ok ? await ordersRes.json() : []
        const menuData = menuRes.ok ? await menuRes.json() : null

        setProfile(profileData)
        setGoogleMapsLink(profileData.googleMapsLink || '')
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setTodayMenu(menuData)
        setLastRefreshedAt(new Date())
      } catch {
        toast.error(clientUiText.loginAgain)
        localStorage.removeItem('customerToken')
        localStorage.removeItem('customerInfo')
        router.push(makeClientSiteHref(params.subdomain, '/login'))
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [clientUiText, dateRange, params.subdomain, router]
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
    const dayMap: ReadonlyArray<readonly [keyof NonNullable<CustomerProfile['deliveryDays']>, string]> = [
      ...(language === 'ru'
        ? [['monday', 'Пн'], ['tuesday', 'Вт'], ['wednesday', 'Ср'], ['thursday', 'Чт'], ['friday', 'Пт'], ['saturday', 'Сб'], ['sunday', 'Вс']] as const
        : [['monday', 'Du'], ['tuesday', 'Se'], ['wednesday', 'Ch'], ['thursday', 'Pa'], ['friday', 'Ju'], ['saturday', 'Sh'], ['sunday', 'Ya']] as const),
    ]

    return dayMap
      .filter(([day]) => Boolean(profile.deliveryDays?.[day]))
      .map(([, label]) => label)
  }, [language, profile?.deliveryDays])

  const currentOrderTone = activeOrder ? ORDER_STATUS_TONES[activeOrder.orderStatus] || 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'

  const lastRefreshLabel = useMemo(
    () =>
      lastRefreshedAt
        ? lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : language === 'ru' ? 'Синхронизация еще не выполнялась' : 'Hali sinxronlanmagan',
    [language, lastRefreshedAt]
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
      toast.error(clientUiText.pasteLocation)
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

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data?.error === 'Invalid Google Maps link or coordinates') {
          toast.error(clientUiText.invalidLocation)
        } else {
          toast.error(clientUiText.failedLocation)
        }
        return
      }

      setProfile(data)
      setGoogleMapsLink(data.googleMapsLink || googleMapsLink)
      toast.success(clientUiText.locationSaved)
    } catch (error) {
      toast.error(clientUiText.failedLocation)
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

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(clientUiText.failedPlan)
      }

      setProfile((prev) => (prev ? { ...prev, autoOrdersEnabled: Boolean(data?.customer?.autoOrdersEnabled) } : prev))
      toast.success(nextActive ? clientUiText.planActivated : clientUiText.planDeactivated)
    } catch (error) {
      toast.error(clientUiText.failedPlan)
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

  const rolePages = ['chat', 'settings', 'orders'] as const
  const rolePageLabels = {
    chat: language === 'ru' ? 'Чат' : 'Suhbat',
    settings: language === 'ru' ? 'Настройки' : 'Sozlamalar',
    orders: language === 'ru' ? 'Заказы' : 'Buyurtmalar',
    calculator: language === 'ru' ? 'Калькулятор' : 'Kalkulyator',
    ingredients: '', cooking: '', dishes: '', groups: '', sets: '', finance: '', contracts: '', transactions: '', routes: '', admins: '', couriers: '', clients: '',
  } as const
  // The customer portal has no server-backed universal commands yet; the strip
  // renders the reference grammar with every command honestly disabled.
  const clientCommands: readonly UniversalCommand[] = []
  const roleCommandLabels = language === 'ru'
    ? { key: 'Ключ', search: 'Поиск', create: 'Создать', enable: 'Включить', disable: 'Отключить', trash: 'Корзина', edit: 'Изменить', sms: 'Сообщение', 'realtime-ai': 'AI' }
    : { key: 'Kalit', search: 'Qidirish', create: 'Yaratish', enable: 'Yoqish', disable: 'Oʻchirish', trash: 'Chiqindi', edit: 'Tahrirlash', sms: 'Xabar', 'realtime-ai': 'AI' }

  return (
    <SitePageSurface site={site}>
      <RoleWorkspaceShell activePage={activeClientPage} pages={rolePages} pageLabels={rolePageLabels} commandLabels={roleCommandLabels} onPageChange={(page) => setActiveClientPage(page === 'chat' || page === 'settings' ? page : 'orders')} allowedCommands={clientCommands}>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--site-border)', color: 'var(--site-accent)' }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {clientUiText.badge}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{clientUiText.welcome}, {profile.name}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
              {clientUiText.phone}: {profile.phone}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
              {clientUiText.needRecords}{' '}
              <Link href={makeClientSiteHref(params.subdomain, '/history')} className="underline">
                {clientUiText.openHistory}
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              {clientUiText.refresh}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2 rounded-md">
              <LogOut className="h-4 w-4" /> {clientUiText.logout}
            </Button>
          </div>
        </div>

        {activeClientPage === 'chat' ? (
            <CustomerChatPanel customerToken={customerToken} />
        ) : activeClientPage === 'orders' ? (
          <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SitePanel className="rounded-md p-4">
            <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{clientUiText.balance}</p>
            <p className="mt-2 text-2xl font-semibold">{(profile.balance || 0).toLocaleString()} UZS</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{clientUiText.activeOrders}</p>
              <Package className="h-4 w-4" style={{ color: 'var(--site-accent)' }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{pendingOrders}</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{clientUiText.delivered}</p>
              <ReceiptText className="h-4 w-4" style={{ color: 'var(--site-accent)' }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{deliveredOrders}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>{clientUiText.completionRate}: {completionRate}%</p>
          </SitePanel>
          <SitePanel className="rounded-md p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{clientUiText.planMode}</p>
              <Clock3 className="h-4 w-4" style={{ color: 'var(--site-accent)' }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{profile.autoOrdersEnabled ? clientUiText.activeState : clientUiText.pausedState}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
              {clientUiText.deliveryDaysMissing}: {activeDeliveryDays || clientUiText.notConfigured}
            </p>
          </SitePanel>
        </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
          <span className="rounded-md border px-3 py-1" style={{ borderColor: 'var(--site-border)' }}>
            {clientUiText.lastSync}: {lastRefreshLabel}
          </span>
          <span className="rounded-md border px-3 py-1" style={{ borderColor: 'var(--site-border)' }}>
            {clientUiText.totalOrders}: {orders.length}
          </span>
        </div>

                      <SitePanel className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{clientUiText.accountSnapshot}</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
                  {clientUiText.accountDescription}
                </p>
              </div>
              <div className="rounded-md border px-4 py-3 text-right" style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}>
                <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{clientUiText.caloriesTarget}</p>
                <p className="mt-2 text-2xl font-semibold">{profile.calories || 0}</p>
              </div>
            </div>

            <div className="rounded-md border px-4 py-3" style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}>
              <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
                <span>{clientUiText.deliveryConsistency}</span>
                <span>{completionRate}%</span>
              </div>
              <div className="mt-3 h-2 rounded-md" style={{ backgroundColor: 'var(--site-panel)' }}>
                <div
                  className="h-2 rounded-md"
                  style={{
                    width: `${completionRate}%`,
                    backgroundColor: 'var(--site-accent)',
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
                <span>{clientUiText.delivered}: {deliveredOrders}</span>
                <span>{clientUiText.activeOrders}: {pendingOrders}</span>
                <span>{clientUiText.queueSize}: {orders.length}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4" style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>{clientUiText.clientBalance}</h3>
                    <p className="mt-1 text-3xl font-semibold">{(profile.balance || 0).toLocaleString()} UZS</p>
                  </div>
                  <Wallet className="h-5 w-5" style={{ color: 'var(--site-accent)' }} />
                </div>
              </div>

              <div className="rounded-md border p-4" style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>{clientUiText.currentOrder}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md px-3 text-xs"
                    onClick={() => router.push(makeClientSiteHref(params.subdomain, '/history'))}
                  >
                    {clientUiText.history}
                  </Button>
                </div>
                {activeOrder ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      {clientUiText.status}:{' '}
                      <strong className={`inline-flex rounded-md px-2 py-0.5 text-xs ${currentOrderTone}`}>
                        {clientOrderStatusLabel(activeOrder.orderStatus, language)}
                      </strong>
                    </p>
                    <p>{clientUiText.order}: #{activeOrder.orderNumber || '-'}</p>
                    <p>{clientUiText.calories}: {activeOrder.calories}</p>
                    <p>{clientUiText.time}: {activeOrder.deliveryTime || clientUiText.notSet}</p>
                    <p>{clientUiText.date}: {activeOrder.deliveryDate ? new Date(activeOrder.deliveryDate).toLocaleDateString(dateLocale) : clientUiText.notSet}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm" style={{ color: 'var(--site-muted)' }}>{clientUiText.noActiveOrder}</p>
                )}
              </div>
            </div>
          </SitePanel>

                    <SitePanel>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{clientUiText.todayMenu}</h2>
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>
                {clientUiText.day} №{todayMenu?.menuNumber || '-'}
                {todayMenu?.source === 'set' && todayMenu.setName ? ` — ${clientUiText.set}: ${todayMenu.setName}` : ''}
              </p>
            </div>
          </div>

          {todayMenu?.dishes?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayMenu.dishes.map((dish) => (
                <div
                  key={`${dish.id}-${dish.mealType}`}
                  className="rounded-md border p-3"
                  style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--site-muted)' }}>{mealTypeLabels[dish.mealType as keyof typeof mealTypeLabels] || dish.mealType}</p>
                      <p className="mt-1 font-medium">{dish.name}</p>
                    </div>
                    <Salad className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--site-accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--site-muted)' }}>{clientUiText.menuMissing}</p>
          )}
        </SitePanel>
          </>
        ) : (
          <>
                      <SitePanel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>{clientUiText.planStatus}</h2>
                <p className="mt-1 text-lg font-semibold">
                  {profile.autoOrdersEnabled ? clientUiText.activeState : clientUiText.inactiveState}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>
                  {clientUiText.inactivePlanDescription}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {deliveryDayLabels.length > 0 ? (
                    deliveryDayLabels.map((day) => (
                      <span
                        key={day}
                        className="inline-flex rounded-md border px-2.5 py-1 text-[11px] font-medium"
                        style={{ borderColor: 'var(--site-border)', backgroundColor: 'var(--site-panel)' }}
                      >
                        {day}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--site-muted)' }}>
                      {clientUiText.deliveryDaysMissing}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  aria-label={language === 'ru' ? 'Статус плана' : 'Reja holati'}
                  checked={profile.autoOrdersEnabled}
                  onCheckedChange={(checked) => void handleTogglePlan(Boolean(checked))}
                  disabled={isTogglingPlan}
                />
              </div>
            </div>
            {isTogglingPlan && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--site-muted)' }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {clientUiText.updatingPlan}
              </p>
            )}
          </SitePanel>

                    <SitePanel>
          <h2 className="text-xl font-semibold">{clientUiText.profile}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>
            {clientUiText.locationHint}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="mapsLink" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {clientUiText.mapsLink}
              </Label>
              <Input
                id="mapsLink"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="https://maps.google.com/?q=41.311081,69.240562"
              />
              <p className="text-xs" style={{ color: 'var(--site-muted)' }}>
                {clientUiText.currentAddress}: {profile.address || clientUiText.notSet}
              </p>
            </div>

            {googleMapsLink.trim() ? (
              <Button variant="outline" className="self-end rounded-md" asChild>
                <a href={googleMapsLink.trim()} target="_blank" rel="noreferrer">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  {clientUiText.openMap}
                </a>
              </Button>
            ) : (
              <Button variant="outline" className="self-end rounded-md" disabled>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                {clientUiText.openMap}
              </Button>
            )}
            <Button onClick={handleSaveLocation} disabled={isSavingLocation} className="self-end rounded-md">
              {isSavingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : clientUiText.saveLocation}
            </Button>
          </div>
        </SitePanel>
          </>
        )}
      </main>
      </RoleWorkspaceShell>
    </SitePageSurface>
  )
}
