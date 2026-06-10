'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconButton } from '@/components/ui/icon-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

import {
  User,
  Save,
  RefreshCw,
  CalendarDays,
  MapPin,
  LocateFixed,
  Clock,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
// framer-motion removed — was imported but never used in this component's JSX.
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminDashboardShell } from '@/features/admin-dashboard/shell'
import type { ProfileUiText as ProfileUiTextType } from '@/features/admin-dashboard/shell'
import { SiteBuilderCard } from '@/components/admin/SiteBuilderCard'

import type { AdminDashboardMode, Client, Order } from '@/features/admin-dashboard/model'
import {
  DEFAULT_COURIER_FORM,
  DEFAULT_CLIENT_FORM,
  DEFAULT_ORDER_FORM,
  DEFAULT_BULK_ORDER_UPDATES,
  DEFAULT_BULK_CLIENT_UPDATES,
  DEFAULT_ORDER_FILTERS,
  DASHBOARD_UI_STORAGE_PREFIX,
  toLocalIsoDate,
  parseLocalIsoDate,
  useAdminDashboardTab,
} from '@/features/admin-dashboard/model'

import { useDashboardData } from '@/components/admin/dashboard/useDashboardData'
// AdminsTab & OrderModal — dynamic for code splitting (heavy tab/modal components)
const AdminsTab = dynamic(
  () => import('@/components/admin/dashboard/tabs-content/AdminsTab').then(m => ({ default: m.AdminsTab })),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)
const OrderModal = dynamic(
  () => import('@/components/admin/dashboard/modals/OrderModal').then(m => ({ default: m.OrderModal })),
  { ssr: false }
)
// DispatchMapPanel — dynamic for code splitting (heavy map component)
const DispatchMapPanel = dynamic(
  () => import('@/components/admin/orders/DispatchMapPanel').then((mod) => mod.DispatchMapPanel),
  { ssr: false, loading: () => <Skeleton className="h-[360px] w-full rounded-xl" /> }
)
import {
  expandShortMapsUrl,
  extractCoordsFromText,
  isShortGoogleMapsUrl,
  parseGoogleMapsUrl,
  type LatLng,
} from '@/lib/geo'
import type { DateRange } from 'react-day-picker'

const HistoryTable = dynamic(
  () => import('@/components/admin/HistoryTable').then((mod) => mod.HistoryTable),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div> }
)
const WarehouseStartPointPickerMap = dynamic(
  () =>
    import('@/components/admin/dashboard/shared/WarehouseStartPointPickerMap').then(
      (mod) => mod.WarehouseStartPointPickerMap
    ),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> }
)

const TodaysMenu = dynamic(
  () => import('@/components/admin/TodaysMenu').then((mod) => mod.TodaysMenu),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)
const WarehouseTab = dynamic(
  () => import('@/components/admin/WarehouseTab').then((mod) => mod.WarehouseTab),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)
const FinanceTab = dynamic(
  () => import('@/components/admin/FinanceTab').then((mod) => mod.FinanceTab),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)
const RouteOptimizeButton = dynamic(
  () => import('@/components/admin/RouteOptimizeButton').then((mod) => mod.RouteOptimizeButton),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-24" /></div> }
)
const MiddleLiveMap = dynamic(
  () => import('@/components/admin/orders/MiddleLiveMap'),
  { ssr: false, loading: () => <Skeleton className="h-[360px] w-full rounded-xl" /> }
)

// Extracted tab components — dynamic for code splitting (heavy tab components)
const StatisticsTab = dynamic(
  () => import('@/features/admin-dashboard/tabs/StatisticsTab').then(m => ({ default: m.StatisticsTab })),
  { ssr: false }
)
const OrdersTab = dynamic(
  () => import('@/features/admin-dashboard/tabs/OrdersTab').then(m => ({ default: m.OrdersTab })),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)
const ClientsTab = dynamic(
  () => import('@/features/admin-dashboard/tabs/ClientsTab').then(m => ({ default: m.ClientsTab })),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)
const BinTab = dynamic(
  () => import('@/features/admin-dashboard/tabs/BinTab').then(m => ({ default: m.BinTab })),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> }
)


export function AdminDashboardPage({ mode }: { mode: AdminDashboardMode }) {
  const { t, language } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [currentDate, setCurrentDate] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => (mode === 'middle' ? new Date() : null))
  const [selectedPeriod, setSelectedPeriod] = useState<DateRange | undefined>(() => {
    if (mode !== 'middle') return undefined
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { from: today, to: today }
  })
  const [, setDateCursor] = useState<Date>(() => new Date())
  const [isUiStateHydrated, setIsUiStateHydrated] = useState(false)
  const [isDispatchOpen, setIsDispatchOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [clientFinanceById, setClientFinanceById] = useState<Record<string, { balance: number; dailyPrice: number }>>(
    {}
  )
  const [isClientFinanceLoading, setIsClientFinanceLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isDeleteOrdersDialogOpen, setIsDeleteOrdersDialogOpen] = useState(false)
  const [isDeleteClientsDialogOpen, setIsDeleteClientsDialogOpen] = useState(false)
  const [isPauseClientsDialogOpen, setIsPauseClientsDialogOpen] = useState(false)
  const [isResumeClientsDialogOpen, setIsResumeClientsDialogOpen] = useState(false)
  const [isDeletingOrders, setIsDeletingOrders] = useState(false)
  const [isMutatingClients, setIsMutatingClients] = useState(false)
  const [optimizeCourierId, setOptimizeCourierId] = useState('all')
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false)
  const [isCreateCourierModalOpen, setIsCreateCourierModalOpen] = useState(false)
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)
  const [isBulkEditOrdersModalOpen, setIsBulkEditOrdersModalOpen] = useState(false)
  const [isBulkEditClientsModalOpen, setIsBulkEditClientsModalOpen] = useState(false)
  const [bulkOrderUpdates, setBulkOrderUpdates] = useState({ ...DEFAULT_BULK_ORDER_UPDATES })
  const [bulkClientUpdates, setBulkClientUpdates] = useState({ ...DEFAULT_BULK_CLIENT_UPDATES })
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false)
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderTimeline, setSelectedOrderTimeline] = useState<
    Array<{
      id: string
      eventType: string
      occurredAt: string
      actorName?: string
      message?: string
      previousStatus?: string | null
      nextStatus?: string | null
    }>
  >([])
  const [isOrderTimelineLoading, setIsOrderTimelineLoading] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const tabsCopy = {
    orders: t.admin.orders,
    clients: t.admin.clients,
    admins: t.admin.admins,
    bin: t.admin.bin,
    statistics: t.admin.statistics,
    history: t.admin.history,
    warehouse: t.warehouse.title,
    finance: t.finance.title,
    interface: t.admin.interface,
  }
  const [courierFormData, setCourierFormData] = useState({ ...DEFAULT_COURIER_FORM })
  const [clientFormData, setClientFormData] = useState({ ...DEFAULT_CLIENT_FORM })
  const [clientSelectedGroupId, setClientSelectedGroupId] = useState<string>('')
  const [orderFormData, setOrderFormData] = useState({ ...DEFAULT_ORDER_FORM })
  const [_parsedCoords, setParsedCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [isCreatingCourier, setIsCreatingCourier] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const handledDashboardQueryRef = useRef<string>('')
  const [warehousePoint, setWarehousePoint] = useState<LatLng | null>(null)
  const [warehouseInput, setWarehouseInput] = useState('')
  const [warehousePreview, setWarehousePreview] = useState<LatLng | null>(null)
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(false)
  const [isWarehouseSaving, setIsWarehouseSaving] = useState(false)
  const [isWarehouseGeoLocating, setIsWarehouseGeoLocating] = useState(false)
  // Set current date on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }))
  }, [])
  const [courierError, setCourierError] = useState('')
  const [clientError, setClientError] = useState('')
  const [filters, setFilters] = useState({ ...DEFAULT_ORDER_FILTERS })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBinClients, setSelectedBinClients] = useState<Set<string>>(new Set())
  const [binOrdersSearch, setBinOrdersSearch] = useState('')
  const [binClientsSearch, setBinClientsSearch] = useState('')
  const [isBinOrdersRefreshing, setIsBinOrdersRefreshing] = useState(false)
  const [isBinClientsRefreshing, setIsBinClientsRefreshing] = useState(false)

  const {
    meRole,
    allowedTabs,
    isLoading,
    lowAdmins,
    orders,
    setOrders,
    clients,
    couriers,
    availableSets,
    stats,
    binClients,
    binOrders,
    refreshAll,
    refreshBinClients,
    refreshBinOrders,
  } = useDashboardData({ selectedPeriod, filters })

  const { activeTab, setActiveTab, visibleTabs } = useAdminDashboardTab({
    mode,
    meRole,
    allowedTabs,
  })

  const fetchData = () => refreshAll()
  const fetchBinClients = () => refreshBinClients()
  const fetchBinOrders = () => refreshBinOrders()

  const clientAssignedSet = useMemo(() => {
    const id = clientFormData.assignedSetId
    if (!id) return null
    return (availableSets || []).find((s: any) => s?.id === id) ?? null
  }, [availableSets, clientFormData.assignedSetId])

  const clientGroupOptions = useMemo(() => {
    const groupsByDay = (clientAssignedSet as any)?.calorieGroups ?? (clientAssignedSet as any)?.groups
    if (!groupsByDay) return [] as Array<{ id: string; name: string; price: number | null }>

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

    if (typeof groupsByDay !== 'object') return [] as Array<{ id: string; name: string; price: number | null }>

    const dayKeys = Object.keys(groupsByDay)
      .filter((k) => /^\d+$/.test(k) && Number(k) > 0)
      .sort((a, b) => Number(a) - Number(b))
    const firstDayWithGroups = dayKeys.find((k) => toGroupsArray((groupsByDay as any)[k]).length > 0)

    if (firstDayWithGroups) {
      return mapOptions(toGroupsArray((groupsByDay as any)[firstDayWithGroups]))
    }

    const fallbackKey = Object.keys(groupsByDay).find((k) => toGroupsArray((groupsByDay as any)[k]).length > 0)
    return fallbackKey ? mapOptions(toGroupsArray((groupsByDay as any)[fallbackKey])) : []
  }, [clientAssignedSet])

  const clientSelectedGroup = useMemo(() => {
    return clientGroupOptions.find((g) => g.id === clientSelectedGroupId) ?? null
  }, [clientGroupOptions, clientSelectedGroupId])

  useEffect(() => {
    if (!clientSelectedGroupId) return
    if (clientGroupOptions.some((g) => g.id === clientSelectedGroupId)) return
    setClientSelectedGroupId('')
  }, [clientGroupOptions, clientSelectedGroupId])

  const [isDashboardRefreshing, setIsDashboardRefreshing] = useState(false)
  const handleRefreshAll = useCallback(async () => {
    setIsDashboardRefreshing(true)
    try {
      await Promise.resolve(refreshAll())
    } finally {
      setIsDashboardRefreshing(false)
    }
  }, [refreshAll])

  const visibleBinOrders = useMemo(() => {
    const q = binOrdersSearch.trim().toLowerCase()
    if (!q) return binOrders
    return binOrders.filter((order: any) => {
      const hay = [
        order?.id,
        order?.status,
        order?.customer?.name,
        order?.customer?.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [binOrders, binOrdersSearch])

  const visibleBinClients = useMemo(() => {
    const q = binClientsSearch.trim().toLowerCase()
    if (!q) return binClients
    return binClients.filter((client: any) => {
      const hay = [client?.name, client?.phone, client?.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [binClients, binClientsSearch])

  const handleRefreshBinOrders = useCallback(async () => {
    setIsBinOrdersRefreshing(true)
    try {
      await Promise.resolve(fetchBinOrders())
    } finally {
      setIsBinOrdersRefreshing(false)
    }
  }, [fetchBinOrders])

  const handleRefreshBinClients = useCallback(async () => {
    setIsBinClientsRefreshing(true)
    try {
      await Promise.resolve(fetchBinClients())
    } finally {
      setIsBinClientsRefreshing(false)
    }
  }, [fetchBinClients])

  useEffect(() => {
    if (activeTab !== 'clients') return
    if (typeof window === 'undefined') return

    const controller = new AbortController()
    setIsClientFinanceLoading(true)

    void fetch('/api/admin/finance/clients?filter=all', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return
        if (!Array.isArray(data)) return
        const next: Record<string, { balance: number; dailyPrice: number }> = {}
        for (const row of data) {
          if (!row || typeof row !== 'object') continue
          const id = (row as any).id
          const balance = (row as any).balance
          const dailyPrice = (row as any).dailyPrice
          if (typeof id !== 'string') continue
          if (typeof balance !== 'number' || !Number.isFinite(balance)) continue
          next[id] = {
            balance,
            dailyPrice: typeof dailyPrice === 'number' && Number.isFinite(dailyPrice) ? dailyPrice : 0,
          }
        }
        setClientFinanceById(next)
      })
      .catch(() => null)
      .finally(() => {
        if (!controller.signal.aborted) setIsClientFinanceLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [activeTab, clients.length])

  const isMiddleAdminView = mode === 'middle' || meRole === 'MIDDLE_ADMIN'
  const isLowAdminView = mode === 'low' || meRole === 'LOW_ADMIN'

  const uiStateStorageKey = useMemo(() => `${DASHBOARD_UI_STORAGE_PREFIX}:${mode}`, [mode])
  const isWarehouseReadOnly = isLowAdminView
  const activeFiltersCount = useMemo(
    () => Object.values(filters).reduce((count, value) => count + (value ? 1 : 0), 0),
    [filters]
  )

  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams) return

    // Allow other pages (e.g. /middle-admin/database) to deep-link into quick sheets.
    const key = searchParams.toString()
    if (!key || handledDashboardQueryRef.current === key) return
    handledDashboardQueryRef.current = key

    if (searchParams.get('settings') === '1') setIsSettingsOpen(true)
    if (searchParams.get('chat') === '1') setIsChatOpen(true)
  }, [searchParams])

  // toLocalIsoDate / parseLocalIsoDate are imported from @/features/admin-dashboard/model

  const isSelectedDateToday = useMemo(() => {
    if (!selectedDate) return false
    const todayISO = toLocalIsoDate(new Date())
    const selectedISO = toLocalIsoDate(selectedDate)
    return selectedISO === todayISO
  }, [selectedDate])

  const selectedDayIsActive = useMemo(() => {
    if (!selectedDate) return null
    if (!Array.isArray(orders) || orders.length === 0) return false
    if (!isSelectedDateToday) return false
    return orders.some((o) => {
      const status = String((o as any)?.orderStatus ?? '')
      const hasCourier = !!(o as any)?.courierId
      return hasCourier && status !== 'NEW' && status !== 'IN_PROCESS'
    })
  }, [isSelectedDateToday, orders, selectedDate])

  const dateLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const profileUiText = useMemo(() => {
    if (language === 'ru') {
      return {
        database: 'База данных',
        noDateSelected: 'Дата не выбрана',
        allOrders: 'Все заказы',
        profileCenter: 'Профиль',
        profileCenterDescription: 'Безопасность, контекст аккаунта и быстрая навигация в одном месте',
        role: 'Роль',
        visibleTabs: 'Видимые вкладки',
        dispatchDate: 'Дата распределения',
        dispatchChooseDate: 'Выбрать дату',
        dispatchSave: 'Сохранить',
        dispatchStart: 'Начать',
        security: 'Безопасность',
        securityDescription: 'Защитите доступ к аккаунту и быстро завершайте сессии.',
        changePassword: 'Сменить пароль',
        quickNavigation: 'Быстрая навигация',
        warehouseStartPoint: 'Стартовая точка склада',
        warehouseStartPointDescription: 'Используется для построения и сортировки маршрутов всех курьеров.',
        warehouseInputLabel: 'Ссылка Google Maps или координаты (lat,lng)',
        readOnly: '(только чтение)',
        warehousePlaceholder: 'Пример: 41.311081,69.240562',
        current: 'Текущая',
        notConfigured: 'не настроено',
        preview: 'Предпросмотр',
        refresh: 'Обновить',
        saving: 'Сохранение...',
        saveLocation: 'Сохранить точку',
        useMyLocation: 'Моё местоположение',
        geolocationUnsupported: 'Геолокация не поддерживается в этом браузере.',
        geolocationDenied: 'Доступ к геолокации запрещён.',
        geolocationFailed: 'Не удалось получить текущее местоположение.',
        geolocationSet: 'Точка установлена по геолокации.',
        messages: 'Сообщения',
        messagesDescription: 'Командные диалоги и быстрая координация.',
        ordersBin: 'Корзина заказов',
        clientsBin: 'Корзина клиентов',
        autoSet: 'Авто (активный глобальный набор)',
        active: '(Активный)',
        enableAutoOrderCreation: 'Включить автоматическое создание заказов',
        searchClientPlaceholder: 'Поиск клиента...',
        searchClientsAria: 'Поиск клиентов',
        clear: 'Очистить',
        calendar: 'Календарь',
        today: 'Сегодня',
        clearDate: 'Очистить дату',
        allTime: 'За все время',
        thisWeek: 'Эта неделя',
        thisMonth: 'Этот месяц',
        next: 'Далее',
        yesterday: 'Вчера',
        tomorrow: 'Завтра',
        searchOrdersPlaceholder: 'Поиск по имени, адресу или номеру заказа...',
        searchOrdersAria: 'Поиск заказов',
        rows: 'строк',
        filters: 'фильтров',
        resetFilters: 'Сбросить фильтры',
        noOrdersFound: 'Заказы не найдены',
        noOrdersFoundDescription: 'Измените фильтры или поисковый запрос.',
        showing: 'Показано',
        of: 'из',
        statusFilter: 'Фильтр статуса',
        allClients: 'Все клиенты',
        activeOnly: 'Только активные',
        pausedOnly: 'Только приостановленные',
        bin: 'Корзина',
        createClient: 'Создать клиента',
        editClient: 'Редактировать клиента',
        updateClientDetails: 'Обновите данные клиента.',
        createClientDescription: 'Создайте нового клиента в системе.',
        nickname: 'Псевдоним',
        nicknamePlaceholder: 'Пример: Офис, Дом... (необязательно)',
        mapLink: 'Ссылка на карту',
        map: 'Карта',
        mapHint: 'Кликните по карте, чтобы выбрать точку (можно также перетаскивать маркер).',
        phoneFormat: 'Формат: +998 XX XXX XX XX',
        balance: 'Баланс',
        days: 'Дни',
        daysShort: 'дн.',
      }
    }
    if (language === 'uz') {
      return {
        database: "Ma'lumotlar bazasi",
        noDateSelected: 'Sana tanlanmagan',
        allOrders: 'Barcha buyurtmalar',
        profileCenter: 'Profil markazi',
        profileCenterDescription: 'Xavfsizlik, akkaunt holati va tezkor navigatsiya bir joyda',
        role: 'Rol',
        visibleTabs: "Ko'rinadigan tablar",
        dispatchDate: "Jo'natish sanasi",
        dispatchChooseDate: 'Sanani tanlang',
        dispatchSave: 'Saqlash',
        dispatchStart: 'Boshlash',
        security: 'Xavfsizlik',
        securityDescription: 'Akkauntga kirishni himoya qiling va sessiyalarni tez yakunlang.',
        changePassword: "Parolni o'zgartirish",
        quickNavigation: 'Tezkor navigatsiya',
        warehouseStartPoint: "Ombor boshlang'ich nuqtasi",
        warehouseStartPointDescription: 'Barcha kuryerlar uchun marshrut qurish va saralashda ishlatiladi.',
        warehouseInputLabel: 'Google Maps havolasi yoki koordinatalar (lat,lng)',
        readOnly: "(faqat o'qish)",
        warehousePlaceholder: 'Misol: 41.311081,69.240562',
        current: 'Joriy',
        notConfigured: 'sozlanmagan',
        preview: "Ko'rib chiqish",
        refresh: 'Yangilash',
        saving: 'Saqlanmoqda...',
        saveLocation: 'Joylashuvni saqlash',
        useMyLocation: 'Mening joylashuvim',
        geolocationUnsupported: "Geolokatsiya ushbu brauzerda qo'llab-quvvatlanmaydi.",
        geolocationDenied: 'Geolokatsiyaga ruxsat berilmadi.',
        geolocationFailed: "Joriy joylashuvni aniqlab bo'lmadi.",
        geolocationSet: "Nuqta geolokatsiya orqali o'rnatildi.",
        messages: 'Xabarlar',
        messagesDescription: 'Jamoa suhbatlari va tezkor muvofiqlashtirish.',
        ordersBin: 'Buyurtmalar savati',
        clientsBin: 'Mijozlar savati',
        autoSet: "Avto (faol global to'plam)",
        active: '(Faol)',
        enableAutoOrderCreation: 'Buyurtmalarni avtomatik yaratishni yoqish',
        searchClientPlaceholder: 'Mijozni qidirish...',
        searchClientsAria: 'Mijozlarni qidirish',
        clear: 'Tozalash',
        calendar: 'Kalendar',
        today: 'Bugun',
        clearDate: 'Sanani tozalash',
        allTime: 'Barcha vaqt',
        thisWeek: 'Shu hafta',
        thisMonth: 'Shu oy',
        next: 'Keyingi',
        yesterday: 'Kecha',
        tomorrow: 'Ertaga',
        searchOrdersPlaceholder: "Ism, manzil yoki buyurtma raqami bo'yicha qidirish...",
        searchOrdersAria: 'Buyurtmalarni qidirish',
        rows: 'qator',
        filters: 'filtr',
        resetFilters: 'Filtrlarni tozalash',
        noOrdersFound: 'Buyurtmalar topilmadi',
        noOrdersFoundDescription: "Filtrlar yoki qidiruv so'rovini o'zgartiring.",
        showing: "Ko'rsatilmoqda",
        of: 'dan',
        statusFilter: 'Holat filtri',
        allClients: 'Barcha mijozlar',
        activeOnly: 'Faqat faol',
        pausedOnly: "Faqat to'xtatilgan",
        bin: 'Savat',
        createClient: 'Mijoz yaratish',
        editClient: 'Mijozni tahrirlash',
        updateClientDetails: "Mijoz ma'lumotlarini yangilang.",
        createClientDescription: 'Tizimda yangi mijoz yarating.',
        nickname: 'Laqab',
        nicknamePlaceholder: 'Misol: Ofis, Uy... (ixtiyoriy)',
        mapLink: 'Xarita havolasi',
        map: 'Xarita',
        mapHint: "Nuqtani tanlash uchun xaritaga bosing (marker-ni sudrab ham bo'ladi).",
        phoneFormat: 'Format: +998 XX XXX XX XX',
        balance: 'Balans',
        days: 'Kunlar',
        daysShort: 'kun',
      }
    }

    return {
      database: 'Database',
      noDateSelected: 'No date selected',
      allOrders: 'All orders',
      profileCenter: 'Profile center',
      profileCenterDescription: 'Security, account context, and quick navigation from one place',
      role: 'Role',
      visibleTabs: 'Visible tabs',
      dispatchDate: 'Dispatch date',
      dispatchChooseDate: 'Choose date',
      dispatchSave: 'Save',
      dispatchStart: 'Start',
      security: 'Security',
      securityDescription: 'Protect account access and end sessions quickly.',
      changePassword: 'Change password',
      quickNavigation: 'Quick navigation',
      warehouseStartPoint: 'Warehouse start point',
      warehouseStartPointDescription: 'Used for route generation and sorting for all couriers.',
      warehouseInputLabel: 'Google Maps URL or coordinates (lat,lng)',
      readOnly: '(read only)',
      warehousePlaceholder: 'Example: 41.311081,69.240562',
      current: 'Current',
      notConfigured: 'not configured',
      preview: 'Preview',
      refresh: 'Refresh',
      saving: 'Saving...',
      saveLocation: 'Save location',
      useMyLocation: 'Use my location',
      geolocationUnsupported: 'Geolocation is not supported by this browser.',
      geolocationDenied: 'Geolocation permission denied.',
      geolocationFailed: 'Failed to get current location.',
      geolocationSet: 'Location set from device.',
      messages: 'Messages',
      messagesDescription: 'Team conversations and quick coordination.',
      ordersBin: 'Orders bin',
      clientsBin: 'Clients bin',
      autoSet: 'Auto (active global set)',
      active: '(Active)',
      enableAutoOrderCreation: 'Enable automatic order creation',
      searchClientPlaceholder: 'Search client...',
      searchClientsAria: 'Search clients',
      clear: 'Clear',
        calendar: 'Calendar',
        today: 'Today',
        clearDate: 'Clear date',
        allTime: 'All time',
        thisWeek: 'This week',
        thisMonth: 'This month',
        next: 'Next',
        yesterday: 'Yesterday',
        tomorrow: 'Tomorrow',
      searchOrdersPlaceholder: 'Search by name, address, or order number...',
      searchOrdersAria: 'Search orders',
      rows: 'rows',
      filters: 'filters',
      resetFilters: 'Reset filters',
      noOrdersFound: 'No orders found',
      noOrdersFoundDescription: 'Adjust the filters or search query.',
      showing: 'Showing',
      of: 'of',
      statusFilter: 'Status filter',
      allClients: 'All clients',
      activeOnly: 'Active only',
      pausedOnly: 'Paused only',
      bin: 'Bin',
      createClient: 'Create client',
      editClient: 'Edit client',
      updateClientDetails: 'Update the client details.',
      createClientDescription: 'Create a new client in the system.',
      nickname: 'Nickname',
      nicknamePlaceholder: 'Example: Office, Home... (optional)',
      mapLink: 'Map link',
      map: 'Map',
      mapHint: 'Click the map to pick a point (you can also drag the marker).',
      phoneFormat: 'Format: +998 XX XXX XX XX',
      balance: 'Balance',
      days: 'Days',
      daysShort: 'd',
    }
  }, [language])
  const selectedDateISO = selectedDate ? toLocalIsoDate(selectedDate) : ''
  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(dateLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : profileUiText.noDateSelected

  const selectedPeriodLabel = useMemo(() => {
    if (!selectedPeriod?.from) return profileUiText.allTime ?? profileUiText.noDateSelected

    const from = selectedPeriod.from
    const to = selectedPeriod.to ?? selectedPeriod.from
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    const fromLabel = from.toLocaleDateString(dateLocale, opts)
    const toLabel = to.toLocaleDateString(dateLocale, opts)
    return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`
  }, [dateLocale, profileUiText.allTime, profileUiText.noDateSelected, selectedPeriod])

  const dispatchOrders = useMemo(() => {
    if (!selectedDateISO) return []
    if (!Array.isArray(orders) || orders.length === 0) return []
    return orders.filter((order: any) => String(order?.deliveryDate ?? '') === selectedDateISO)
  }, [orders, selectedDateISO])

  const applySelectedDate = useCallback((nextDate: Date | null) => {
    if (!nextDate) {
      setSelectedDate(null)
      setSelectedPeriod(undefined)
      return
    }

    const normalizedDate = new Date(nextDate)
    normalizedDate.setHours(0, 0, 0, 0)

    if (!Number.isNaN(normalizedDate.getTime())) {
      setSelectedDate(normalizedDate)
      setSelectedPeriod({ from: normalizedDate, to: normalizedDate })
      setDateCursor(normalizedDate)
    }
  }, [])

  const applySelectedPeriod = useCallback((nextPeriod: DateRange | undefined) => {
    if (!nextPeriod?.from) {
      setSelectedPeriod(undefined)
      setSelectedDate(null)
      setDateCursor(new Date())
      return
    }

    const from = new Date(nextPeriod.from)
    from.setHours(0, 0, 0, 0)
    const to = nextPeriod.to ? new Date(nextPeriod.to) : new Date(from)
    to.setHours(0, 0, 0, 0)

    setSelectedPeriod({ from, to })

    const fromIso = toLocalIsoDate(from)
    const toIso = toLocalIsoDate(to)
    if (fromIso === toIso) {
      setSelectedDate(from)
      setDateCursor(from)
    } else {
      setSelectedDate(null)
      setDateCursor(from)
    }
  }, [])

  const shiftSelectedDate = useCallback((days: number) => {
    const baseDate = selectedDate ? new Date(selectedDate) : new Date()
    baseDate.setDate(baseDate.getDate() + days)
    applySelectedDate(baseDate)
  }, [applySelectedDate, selectedDate])

  const normalizedOrdersForSelectedDate = useMemo(() => {
    if (!selectedDate) return orders
    if (isSelectedDateToday) return orders
    if (!Array.isArray(orders) || orders.length === 0) return orders

    return orders.map((o) => {
      const status = String((o as any)?.orderStatus ?? '')
      if (status === 'PENDING' || status === 'IN_DELIVERY' || status === 'PAUSED') {
        return { ...o, orderStatus: 'NEW' }
      }
      return o
    })
  }, [isSelectedDateToday, orders, selectedDate])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) return normalizedOrdersForSelectedDate

    return normalizedOrdersForSelectedDate.filter((order) => {
      const customerName = (order.customer?.name || order.customerName || '').toLowerCase()
      const deliveryAddress = (order.deliveryAddress || '').toLowerCase()
      const orderNumber = String(order.orderNumber ?? '')

      return (
        customerName.includes(normalizedSearch) ||
        deliveryAddress.includes(normalizedSearch) ||
        orderNumber.includes(normalizedSearch)
      )
    })
  }, [normalizedOrdersForSelectedDate, searchTerm])

  const filteredClients = useMemo(() => {
    const normalizedSearch = clientSearchTerm.trim().toLowerCase()

    return clients.filter((client) => {
      if (!normalizedSearch) return true

      return [client.name, client.nickName, client.phone, client.address]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedSearch))
    })
  }, [clientSearchTerm, clients])

  // Sort & Filter for clients table
  const [clientSortStates, setClientSortStates] = useState<Record<string, SortState>>({})
  const [clientFilterOpen, setClientFilterOpen] = useState(false)
  const [clientFilterValues, setClientFilterValues] = useState<Record<string, string>>({})

  const clientColumns: SortableColumn[] = useMemo(() => [
    { key: 'name', label: t.common.name, type: 'text' },
    { key: 'nickname', label: profileUiText.nickname, type: 'text' },
    { key: 'phone', label: t.common.phone, type: 'text' },
    { key: 'balance', label: profileUiText.balance ?? 'Balance', type: 'number' },
    { key: 'days', label: profileUiText.days ?? 'Days', type: 'number' },
    { key: 'address', label: t.common.address, type: 'text' },
    { key: 'calories', label: 'Calories', type: 'number' },
    { key: 'orders', label: 'Orders', type: 'number' },
    { key: 'deliveryDays', label: 'Delivery Days', type: 'text' },
    { key: 'status', label: t.common.status, type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text' },
    { key: 'created', label: 'Created', type: 'text' },
  ], [t, profileUiText])

  const clientFilterColumns: FilterColumn[] = clientColumns

  const handleClientSortChange = useCallback((key: string, state: SortState) => {
    setClientSortStates((prev) => ({ ...prev, [key]: state }))
  }, [])

  const handleClientFilterChange = useCallback((key: string, value: string) => {
    setClientFilterValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClientClearAllFilters = useCallback(() => {
    setClientFilterValues({})
  }, [])

  const processedClients = useMemo(() => {
    const flatRows = filteredClients.map((client) => {
      const finance = clientFinanceById[client.id]
      const deliveryDayParts: string[] = []
      if (client.deliveryDays?.monday) deliveryDayParts.push('Mon')
      if (client.deliveryDays?.tuesday) deliveryDayParts.push('Tue')
      if (client.deliveryDays?.wednesday) deliveryDayParts.push('Wed')
      if (client.deliveryDays?.thursday) deliveryDayParts.push('Thu')
      if (client.deliveryDays?.friday) deliveryDayParts.push('Fri')
      if (client.deliveryDays?.saturday) deliveryDayParts.push('Sat')
      if (client.deliveryDays?.sunday) deliveryDayParts.push('Sun')
      return {
        name: client.name,
        nickname: client.nickName || '',
        phone: client.phone,
        balance: String(Math.round(finance?.balance ?? 0)),
        days: String(Math.floor((finance?.balance ?? 0) / (finance?.dailyPrice || client.dailyPrice || 1))),
        address: client.address || '',
        calories: String(client.calories ?? 0),
        orders: String(orders.filter((o) => o.customerPhone === client.phone).length),
        deliveryDays: deliveryDayParts.join(' '),
        status: client.isActive ? t.admin.table.active : t.admin.table.paused,
        notes: client.specialFeatures || '',
        created: new Date(client.createdAt).toLocaleDateString('en-GB'),
        _original: client,
      }
    })

    const filtered = applyFilters(flatRows as unknown as Record<string, unknown>[], clientFilterValues, clientFilterColumns)
    const sorted = sortData(filtered as unknown as Record<string, unknown>[], clientSortStates, clientColumns)
    return sorted.map((row: Record<string, unknown>) => (row as { _original: typeof clients[0] })._original)
  }, [filteredClients, clientFinanceById, orders, clientFilterValues, clientSortStates, clientColumns, clientFilterColumns, t.admin.table])

  const selectedClientsSnapshot = useMemo(
    () => clients.filter((client) => selectedClients.has(client.id)),
    [clients, selectedClients]
  )
  const shouldPauseSelectedClients =
    selectedClientsSnapshot.length > 0 && selectedClientsSnapshot.every((client) => client.isActive)

  const clearOrderFilters = useCallback(() => {
    setFilters({ ...DEFAULT_ORDER_FILTERS })
  }, [])

  const refreshWarehousePoint = async () => {
    setIsWarehouseLoading(true)
    try {
      const res = await fetch('/api/admin/warehouse')
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const lat = data && typeof data.lat === 'number' ? data.lat : null
      const lng = data && typeof data.lng === 'number' ? data.lng : null
      const point = lat != null && lng != null ? ({ lat, lng } as LatLng) : null
      setWarehousePoint(point)
      setWarehousePreview(point)
      setWarehouseInput(point ? `${lat},${lng}` : '')
    } catch (error) {
      console.error('Error loading warehouse point:', error)
    } finally {
      setIsWarehouseLoading(false)
    }
  }

  useEffect(() => {
    void refreshWarehousePoint()
  }, [])

  useEffect(() => {
    // Ensure future days remain drafts (server-side normalization for legacy data)
    void fetch('/api/admin/dispatch/normalize-drafts', { method: 'POST' }).catch(() => null)
  }, [])

  // Add effect to reset selected clients when filter changes
  useEffect(() => {
    setSelectedClients(new Set())
  }, [clientSearchTerm])

  useEffect(() => {
    if (!isOrderDetailsModalOpen || !selectedOrder?.id) {
      setSelectedOrderTimeline([])
      return
    }

    let cancelled = false
    setIsOrderTimelineLoading(true)

    void fetch(`/api/admin/orders/${selectedOrder.id}/timeline`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return
        const events = Array.isArray(data?.events) ? data.events : []
        setSelectedOrderTimeline(events)
      })
      .catch(() => {
        if (!cancelled) setSelectedOrderTimeline([])
      })
      .finally(() => {
        if (!cancelled) setIsOrderTimelineLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOrderDetailsModalOpen, selectedOrder?.id])

  useEffect(() => {
    if (isUiStateHydrated || typeof window === 'undefined') return

    try {
      const rawState = localStorage.getItem(uiStateStorageKey)
      if (!rawState) {
        setIsUiStateHydrated(true)
        return
      }

      const state = JSON.parse(rawState) as {
        selectedDateISO?: string | null
        selectedPeriodISO?: { from: string; to: string } | null
        showFilters?: boolean
        searchTerm?: string
        clientSearchTerm?: string
        optimizeCourierId?: string
      }

      if (typeof state.showFilters === 'boolean') setShowFilters(state.showFilters)
      if (typeof state.searchTerm === 'string') setSearchTerm(state.searchTerm.slice(0, 160))
      if (typeof state.clientSearchTerm === 'string') setClientSearchTerm(state.clientSearchTerm.slice(0, 160))
      if (typeof state.optimizeCourierId === 'string') setOptimizeCourierId(state.optimizeCourierId)
      if (state.selectedPeriodISO === null || state.selectedDateISO === null) {
        setSelectedPeriod(undefined)
        setSelectedDate(null)
        setDateCursor(new Date())
      } else if (state.selectedPeriodISO && typeof state.selectedPeriodISO === 'object') {
        const restoredFrom = parseLocalIsoDate(state.selectedPeriodISO.from)
        const restoredTo = parseLocalIsoDate(state.selectedPeriodISO.to)
        if (restoredFrom && restoredTo) {
          applySelectedPeriod({ from: restoredFrom, to: restoredTo })
        }
      } else if (typeof state.selectedDateISO === 'string') {
        const restoredDate = parseLocalIsoDate(state.selectedDateISO)
        if (restoredDate) {
          applySelectedPeriod({ from: restoredDate, to: restoredDate })
        }
      }
    } catch (error) {
      console.error('Unable to restore dashboard UI state:', error)
    } finally {
      setIsUiStateHydrated(true)
    }
  }, [applySelectedPeriod, isUiStateHydrated, uiStateStorageKey])

  useEffect(() => {
    if (!isUiStateHydrated || typeof window === 'undefined') return

    localStorage.setItem(
      uiStateStorageKey,
      JSON.stringify({
        selectedPeriodISO: selectedPeriod?.from
          ? {
              from: toLocalIsoDate(selectedPeriod.from),
              to: toLocalIsoDate(selectedPeriod.to ?? selectedPeriod.from),
            }
          : null,
        showFilters,
        searchTerm,
        clientSearchTerm,
        optimizeCourierId,
      })
    )
  }, [
    clientSearchTerm,
    isUiStateHydrated,
    optimizeCourierId,
    searchTerm,
    selectedPeriod,
    showFilters,
    uiStateStorageKey,
  ])

  useEffect(() => {
    if (selectedPeriod?.from) setDateCursor(selectedPeriod.from)
  }, [selectedPeriod])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isEditable = !!target && (target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && activeTab === 'orders') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      if (event.key === '/' && !isEditable && activeTab === 'orders') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (event.key === 'Escape') {
        if (showFilters) {
          setShowFilters(false)
          event.preventDefault()
          return
        }
        if (activeTab === 'orders' && searchTerm) {
          setSearchTerm('')
          event.preventDefault()
        }
      }

      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(event.key)) {
        const tab = visibleTabs[Number(event.key) - 1]
        if (tab) {
          event.preventDefault()
          setActiveTab(tab)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTab, searchTerm, showFilters, visibleTabs])

  const handleLogout = async () => {
    // Clear localStorage (for backward compatibility)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    // Sign out from NextAuth (clears session cookies)
    await signOut({ callbackUrl: '/', redirect: true })
  }

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const handleSelectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)))
    }
  }

  const handleDeleteSelectedOrders = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedOrders.size === 0) {
      toast.error(t.admin.toasts.selectOrdersToDelete)
      return
    }

    if (!skipConfirm) {
      setIsDeleteOrdersDialogOpen(true)
      return
    }

    try {
      setIsDeletingOrders(true)
      const response = await fetch('/api/admin/orders/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.ordersDeleted.replace('{count}', String(data.deletedCount)))
        setSelectedOrders(new Set())
        setIsDeleteOrdersDialogOpen(false)
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorDeletingOrders)
      }
    } catch (error) {
      console.error('Delete orders error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
      toast.error(t.admin.toasts.serverConnectionError)
      setIsDeletingOrders(false)
    }
  }

  const handlePermanentDeleteOrders = async () => {
    if (isLowAdminView) {
      toast.error(t.admin.toasts.notAllowed)
      return
    }
    if (selectedOrders.size === 0) {
      toast.error(t.admin.toasts.selectOrdersToDelete)
      return
    }

    const confirmMessage = t.admin.toasts.confirmPermanentDeleteOrders.replace('{count}', String(selectedOrders.size))
    if (!confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = confirm(t.admin.toasts.confirmPermanentDeleteOrdersAgain)
    if (!doubleConfirm) {
      return
    }

    try {
      const response = await fetch('/api/admin/orders/permanent-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.ordersPermanentlyDeleted.replace('{count}', String(data.deletedCount)))
        setSelectedOrders(new Set())
        fetchBinOrders()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorDeletingOrders)
      }
    } catch (error) {
      console.error('Permanent delete orders error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const handleRestoreSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error(t.admin.toasts.selectOrdersToRestore)
      return
    }

    if (!confirm(t.admin.toasts.confirmRestoreOrders.replace('{count}', String(selectedOrders.size)))) {
      return
    }

    try {
      const response = await fetch('/api/admin/orders/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.ordersRestored.replace('{count}', String(data.updatedCount)))
        setSelectedOrders(new Set())
        fetchBinOrders()
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorRestoringOrders)
      }
    } catch (error) {
      console.error('Restore orders error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const handleSelectAllBinOrders = () => {
    const visibleIds = visibleBinOrders.map((order: any) => order.id).filter(Boolean) as string[]
    if (visibleIds.length === 0) return

    const allVisibleSelected = visibleIds.every((id) => selectedOrders.has(id))
    setSelectedOrders((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handlePermanentDeleteClients = async () => {
    if (isLowAdminView) {
      toast.error(t.admin.toasts.notAllowed)
      return
    }
    if (selectedBinClients.size === 0) {
      toast.error(t.admin.toasts.selectClientsToDelete)
      return
    }

    const confirmMessage = t.admin.toasts.confirmPermanentDeleteClients.replace('{count}', String(selectedBinClients.size))
    if (!confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = confirm(t.admin.toasts.confirmPermanentDeleteClientsAgain)
    if (!doubleConfirm) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/permanent-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientIds: Array.from(selectedBinClients) })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.clientsPermanentlyDeleted.replace('{count}', String(data.deletedClients)))
        setSelectedBinClients(new Set())
        fetchBinClients()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorDeletingClients)
      }
    } catch (error) {
      console.error('Permanent delete clients error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const handleWarehouseInputChange = (value: string) => {
    setWarehouseInput(value)
    const coords = extractCoordsFromText(value)
    setWarehousePreview(coords)
  }

  const handleWarehouseInputBlur = async () => {
    if (!warehouseInput || warehousePreview) return
    if (!isShortGoogleMapsUrl(warehouseInput)) return

    try {
      const expanded = await expandShortMapsUrl(warehouseInput)
      if (!expanded) return
      const coords = extractCoordsFromText(expanded)
      if (coords) setWarehousePreview(coords)
    } catch (error) {
      console.error('Error expanding warehouse url:', error)
    }
  }

  const formatWarehousePoint = useCallback((point: LatLng) => {
    return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`
  }, [])

  const handleWarehouseMapPick = useCallback(
    (point: LatLng) => {
      handleWarehouseInputChange(formatWarehousePoint(point))
    },
    [formatWarehousePoint, handleWarehouseInputChange]
  )

  const handleUseMyLocation = useCallback(() => {
    if (isWarehouseReadOnly) return
    if (typeof window === 'undefined') return

    if (!navigator.geolocation) {
      toast.error(profileUiText.geolocationUnsupported)
      return
    }

    setIsWarehouseGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        handleWarehouseInputChange(formatWarehousePoint(point))
        toast.success(profileUiText.geolocationSet)
        setIsWarehouseGeoLocating(false)
      },
      (err) => {
        if (err && 'code' in err && err.code === 1) {
          toast.error(profileUiText.geolocationDenied)
        } else {
          toast.error(profileUiText.geolocationFailed)
        }
        setIsWarehouseGeoLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [formatWarehousePoint, handleWarehouseInputChange, isWarehouseReadOnly, profileUiText])

  const handleSaveWarehousePoint = async () => {
    if (isWarehouseReadOnly) return
    if (!warehouseInput.trim()) {
      toast.error(t.admin.toasts.enterMapsLinkOrCoords)
      return
    }

    setIsWarehouseSaving(true)
    try {
      const res = await fetch('/api/admin/warehouse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleMapsLink: warehouseInput.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((data && data.error) || t.admin.toasts.errorSavingWarehouse)
      }

      const lat = data && typeof data.lat === 'number' ? data.lat : null
      const lng = data && typeof data.lng === 'number' ? data.lng : null
      const point = lat != null && lng != null ? ({ lat, lng } as LatLng) : null
      setWarehousePoint(point)
      setWarehousePreview(point)
      setWarehouseInput(point ? `${lat},${lng}` : '')

      toast.success(t.admin.toasts.warehouseSaved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.admin.toasts.errorSavingWarehouse)
    } finally {
      setIsWarehouseSaving(false)
    }
  }

  const handleAddressChange = async (value: string) => {
    setOrderFormData(prev => ({ ...prev, deliveryAddress: value }))

    const parsed = await parseGoogleMapsUrl(value)
    setParsedCoords(parsed)
    setOrderFormData(prev => ({
      ...prev,
      latitude: parsed?.lat ?? null,
      longitude: parsed?.lng ?? null
    }))
  }

  const handleClientAddressChange = async (value: string) => {
    setClientFormData(prev => ({ ...prev, googleMapsLink: value }))

    if (!value) {
      setClientFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null
      }))
      return
    }

    const parsed = await parseGoogleMapsUrl(value)
    if (parsed) {
      setClientFormData(prev => ({
        ...prev,
        latitude: parsed.lat,
        longitude: parsed.lng
      }))
    } else {
      setClientFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null
      }))
    }
  }



  const handleDeleteSelectedClients = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedClients.size === 0) {
      toast.error(t.admin.toasts.selectClientsToDelete)
      return
    }

    if (!skipConfirm) {
      setIsDeleteClientsDialogOpen(true)
      return
    }

    try {
      setIsMutatingClients(true)
      const response = await fetch('/api/admin/clients/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          deleteOrders: true,
          daysBack: 30
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.clientsAndOrdersDeleted.replace('{clients}', String(data.deletedClients)).replace('{orders}', String(data.deletedOrders)))
        setSelectedClients(new Set())
        setIsDeleteClientsDialogOpen(false)
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorDeletingClients)
      }
    } catch (error) {
      console.error('Delete clients error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    } finally {
      setIsMutatingClients(false)
    }
  }

  const handleClientSelect = (clientId: string) => {
    if (clientId && clientId !== "manual") {
      const selectedClient = clients.find(client => client.id === clientId)
      if (selectedClient) {
        setOrderFormData(prev => ({
          ...prev,
          selectedClientId: clientId,
          customerName: selectedClient.name,
          customerPhone: selectedClient.phone,
          deliveryAddress: selectedClient.address,
          calories: selectedClient.calories,
          specialFeatures: selectedClient.specialFeatures,
          assignedSetId: selectedClient.assignedSetId || ''
        }))

        void parseGoogleMapsUrl(selectedClient.address).then(parsed => {
          setParsedCoords(parsed)
        })
      }
    } else {
      // Если клиент не выбран или выбран ручной ввод, очищаем поля но оставляем значения по умолчанию
      setOrderFormData(prev => ({
        ...prev,
        selectedClientId: clientId === "manual" ? "manual" : '',
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        calories: 1200,
        specialFeatures: '',
        assignedSetId: ''
      }))
      setParsedCoords(null)
    }
  }



  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingOrder(true)
    setOrderError('')

    try {
      const parsedCoordinates = await parseGoogleMapsUrl(orderFormData.deliveryAddress)

      const latitude = parsedCoordinates?.lat ?? null
      const longitude = parsedCoordinates?.lng ?? null

      // Add coordinates and date to order data, but keep original address
      const effectiveOrderDate = toLocalIsoDate(selectedDate ?? new Date())

      const orderDataWithCoords = {
        ...orderFormData,
        // Keep the original deliveryAddress, don't overwrite with coordinates
        latitude,
        longitude,
        date: effectiveOrderDate
      }

      let response;
      if (editingOrderId) {
        // Update existing order
        // We need to use a different endpoint or method for full update
        // Currently we only have PATCH for status/courier actions
        // Let's assume we can use the same POST endpoint but with an ID or a new PUT endpoint
        // But bulk update is limited.
        // Let's use a new action 'update_details' on the [id] route or create a new route.
        // For now, let's use the [id] route with a custom action.
        response = await fetch(`/api/orders/${editingOrderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_details',
            ...orderDataWithCoords
          })
        })
      } else {
        // Create new order
        response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderDataWithCoords)
        })
      }

      const data = await response.json()

      if (response.ok) {
        setIsCreateOrderModalOpen(false)
        setParsedCoords(null)
        setOrderFormData({ ...DEFAULT_ORDER_FORM })
        setEditingOrderId(null)
        fetchData()
      } else {
        setOrderError(data.error || t.admin.toasts.errorSavingOrder)
      }
    } catch {
      setOrderError(t.admin.toasts.serverConnectionError)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id)
    const inferredAssignedSetId =
      order.customer.assignedSetId ||
      (clients.find(c => c.phone === order.customer.phone)?.assignedSetId ?? '')
    setOrderFormData({
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      deliveryAddress: order.deliveryAddress,
      deliveryTime: order.deliveryTime,
      quantity: order.quantity,
      calories: order.calories,
      specialFeatures: order.specialFeatures || '',
      paymentStatus: order.paymentStatus as string,
      paymentMethod: order.paymentMethod as string,
      isPrepaid: order.isPrepaid,
      amountReceived: typeof order.amountReceived === 'number' ? order.amountReceived : null,
      selectedClientId: '', // We don't link back to client selection for now to avoid overwriting
      latitude: order.latitude || null,
      longitude: order.longitude || null,
      courierId: order.courierId || '',
      assignedSetId: inferredAssignedSetId
    })
    setIsCreateOrderModalOpen(true)
  }

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingCourier(true)
    setCourierError('')

    try {
      const response = await fetch('/api/admin/couriers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...courierFormData,
          role: 'COURIER'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateCourierModalOpen(false)
        setCourierFormData({ name: '', email: '', password: '', salary: '' })
        fetchData()
        toast.success(t.admin.toasts.courierCreated)
      } else {
        setCourierError(data.error || t.admin.toasts.errorCreatingCourier)
      }
    } catch {
      setCourierError(t.admin.toasts.serverConnectionError)
    } finally {
      setIsCreatingCourier(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingClient(true)
    setClientError('')

    try {
      const url = editingClientId
        ? `/api/admin/clients/${editingClientId}`
        : '/api/admin/clients'

      const method = editingClientId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientFormData)
      })

      const data = await response.json()

      if (response.ok) {
        setIsCreateClientModalOpen(false)
        setClientSelectedGroupId('')
        setClientFormData({
          name: '',
          nickName: '',
          phone: '',
          address: '',
          calories: 1200,
          planType: 'CLASSIC',
          dailyPrice: 84000,
          notes: '',
          specialFeatures: '',
          deliveryDays: {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false
          },
          autoOrdersEnabled: true,
          isActive: true,
          defaultCourierId: '',
          googleMapsLink: '',
          latitude: null,
          longitude: null,
          assignedSetId: ''
        })
        setEditingClientId(null)

        // Show success message
        const action = editingClientId ? t.admin.toasts.clientUpdated : t.admin.toasts.clientCreated
        const message = t.admin.toasts.clientActionSuccess.replace('{name}', data.client?.name || clientFormData.name).replace('{action}', action)
        let description = ''
        if (!editingClientId && data.autoOrdersCreated && data.autoOrdersCreated > 0) {
          description = t.admin.toasts.autoOrdersCreatedInfo.replace('{count}', String(data.autoOrdersCreated))
        }

        toast.success(message, { description })
        fetchData()
      } else {
        const errorMessage = data.error || (editingClientId ? t.admin.toasts.errorUpdatingClient : t.admin.toasts.errorCreatingClient)
        const errorDetails = data.details ? `\n${data.details}` : ''
        setClientError(`${errorMessage}${errorDetails}`)
        toast.error(errorMessage, { description: data.details })
      }
    } catch {
      setClientError(t.admin.toasts.serverConnectionError)
    } finally {
      setIsCreatingClient(false)
    }
  }



  // Mobile View Helper - Removed duplicates from here



  const handleEditClient = (client: Client) => {
    setClientSelectedGroupId('')
    setClientFormData({
      name: client.name,
      nickName: client.nickName || '',
      phone: client.phone,
      address: client.address,
      calories: client.calories,
      planType: client.planType || 'CLASSIC',
      dailyPrice: client.dailyPrice || 84000,
      notes: client.notes || '',
      specialFeatures: client.specialFeatures || '',
      deliveryDays: client.deliveryDays || {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      autoOrdersEnabled: client.autoOrdersEnabled,
      isActive: client.isActive,
      defaultCourierId: client.defaultCourierId || '',
      googleMapsLink: client.googleMapsLink || '',
      latitude: client.latitude || null,
      longitude: client.longitude || null,
      assignedSetId: client.assignedSetId || ''
    })
    setEditingClientId(client.id)
    setIsCreateClientModalOpen(true)
  }

  const handleToggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/clients/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientIds: [clientId], isActive: !currentStatus })
      })

      if (response.ok) {
        toast.success(!currentStatus ? t.admin.toasts.clientActivated : t.admin.toasts.clientSuspended)
        fetchData()
      } else {
        toast.error(t.admin.toasts.errorChangingClientStatus)
      }
    } catch (error) {
      console.error('Error toggling client status:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const _handleDeleteClient = async (clientId: string) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
        }
      })

      if (response.ok) {
        fetchData()
      } else {
        const data = await response.json()
        console.error('Error deleting client:', data.error)
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }

  const handleToggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handlePauseSelectedClients = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedClients.size === 0) {
      toast.error(t.admin.toasts.selectClientsToPause)
      return
    }

    if (!skipConfirm) {
      setIsPauseClientsDialogOpen(true)
      return
    }

    try {
      setIsMutatingClients(true)
      const response = await fetch('/api/admin/clients/toggle-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          isActive: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.clientsPaused.replace('{count}', String(data.updatedCount)))
        setSelectedClients(new Set())
        setIsPauseClientsDialogOpen(false)
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorPausingClients)
      }
    } catch (error) {
      console.error('Error pausing clients:', error)
      toast.error(t.admin.toasts.serverConnectionErrorRetry)
    } finally {
      setIsMutatingClients(false)
    }
  }

  const handleResumeSelectedClients = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedClients.size === 0) {
      toast.error(t.admin.toasts.selectClientsToResume)
      return
    }

    if (!skipConfirm) {
      setIsResumeClientsDialogOpen(true)
      return
    }

    try {
      setIsMutatingClients(true)
      const response = await fetch('/api/admin/clients/toggle-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          isActive: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.clientsResumed.replace('{count}', String(data.updatedCount)))
        setSelectedClients(new Set())
        setIsResumeClientsDialogOpen(false)
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorResumingClients)
      }
    } catch (error) {
      console.error('Error resuming clients:', error)
      toast.error(t.admin.toasts.serverConnectionErrorRetry)
    } finally {
      setIsMutatingClients(false)
    }
  }

  const handleBulkUpdateOrders = async () => {
    if (selectedOrders.size === 0) return
    setIsUpdatingBulk(true)

    try {
      const updates: any = {}
      if (bulkOrderUpdates.orderStatus) updates.orderStatus = bulkOrderUpdates.orderStatus
      if (bulkOrderUpdates.paymentStatus) updates.paymentStatus = bulkOrderUpdates.paymentStatus
      if (bulkOrderUpdates.courierId) updates.courierId = bulkOrderUpdates.courierId
      if (bulkOrderUpdates.deliveryDate) updates.deliveryDate = bulkOrderUpdates.deliveryDate

      const response = await fetch('/api/admin/orders/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          updates
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.ordersUpdated.replace('{count}', String(data.updatedCount)))
        setIsBulkEditOrdersModalOpen(false)
        setSelectedOrders(new Set())
        setBulkOrderUpdates({
          orderStatus: '',
          paymentStatus: '',
          courierId: '',
          deliveryDate: ''
        })
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorUpdatingOrders, {
          description: data.details || undefined
        })
      }
    } catch (error) {
      console.error('Error bulk updating orders:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    } finally {
      setIsUpdatingBulk(false)
    }
  }



  const handleBulkUpdateClients = async () => {
    if (selectedClients.size === 0) return
    setIsUpdatingBulk(true)

    try {
      const updates: any = {}
      if (bulkClientUpdates.isActive !== undefined) updates.isActive = bulkClientUpdates.isActive
      if (bulkClientUpdates.calories) updates.calories = bulkClientUpdates.calories

      const response = await fetch('/api/admin/clients/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          updates
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.clientsUpdated.replace('{count}', String(data.updatedCount)))
        setIsBulkEditClientsModalOpen(false)
        setSelectedClients(new Set())
        setBulkClientUpdates({
          isActive: undefined,
          calories: ''
        })
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorUpdatingClients)
      }
    } catch (error) {
      console.error('Error bulk updating clients:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    } finally {
      setIsUpdatingBulk(false)
    }
  }

  const handleRestoreSelectedClients = async () => {
    if (selectedBinClients.size === 0) {
      toast.error(t.admin.toasts.selectClientsToRestore)
      return
    }

    const selectedClientsList = Array.from(selectedBinClients).map(id =>
      binClients.find(c => c.id === id)?.name || t.admin.toasts.unknownClient
    ).join(', ')

    const hasActiveClients = binClients.some(c => selectedBinClients.has(c.id) && c.isActive)
    const confirmMessage = `${t.admin.toasts.confirmRestoreClients}\n\n${selectedClientsList}\n\n${hasActiveClients ? t.admin.toasts.autoOrdersForActiveClients : ''}`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedBinClients)
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.clientsRestored.replace('{count}', String(data.restoredClients)))
        setSelectedBinClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorRestoringClients)
      }
    } catch (error) {
      console.error('Restore clients error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const _handlePermanentDeleteSelected = async () => {
    if (selectedBinClients.size === 0) {
      toast.error(t.admin.toasts.selectClientsForPermanentDelete)
      return
    }

    const selectedClientsList = Array.from(selectedBinClients).map(id =>
      binClients.find(c => c.id === id)?.name || t.admin.toasts.unknownClient
    ).join(', ')

    const confirmMessage = t.admin.toasts.confirmPermanentDeleteClients.replace('{count}', String(selectedBinClients.size))

    if (!confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = confirm(t.admin.toasts.confirmPermanentDeleteClientsAgain)
    if (!doubleConfirm) {
      return
    }

    try {
      const response = await fetch('/api/admin/clients/permanent-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: Array.from(selectedBinClients)
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.clientsPermanentlyDeleted.replace('{count}', String(data.deletedClients)))
        setSelectedBinClients(new Set())
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorDeletingClients)
      }
    } catch (error) {
      console.error('Permanent delete error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const handleRunAutoOrders = async () => {
    try {
      toast.info(t.admin.toasts.startingAutoOrders)

      const response = await fetch('/api/admin/auto-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetDate: new Date() })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.autoOrdersCreatedCount.replace('{count}', String(data.ordersCreated)))
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || t.admin.toasts.errorCreatingOrders)
      }
    } catch (error) {
      console.error('Run auto orders error:', error)
      toast.error(t.admin.toasts.serverConnectionError)
    }
  }

  const isOrderInOptimizeScope = (order: Order) => {
    if (optimizeCourierId === 'all') return true
    if (optimizeCourierId === 'unassigned') return !order.courierId
    return order.courierId === optimizeCourierId
  }

  const applyOptimizedOrdering = (orderedIds: string[]) => {
    const idToOrder = new Map(orders.map(order => [order.id, order]))
    const optimizedOrders = orderedIds.map(id => idToOrder.get(id)).filter(Boolean) as Order[]
    let optimizedIndex = 0

    const nextOrders = orders.map(order => {
      if (!isOrderInOptimizeScope(order)) return order
      const next = optimizedOrders[optimizedIndex]
      optimizedIndex += 1
      return next || order
    })

    setOrders(nextOrders)
  }

  const _handleToggleBinClientSelection = (clientId: string) => {
    setSelectedBinClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handleDeliveryDayChange = (day: string, checked: boolean) => {
    setClientFormData(prev => ({
      ...prev,
      deliveryDays: {
        ...prev.deliveryDays,
        [day]: checked
      }
    }))
  }

  const _handleOpenOrder = (orderId: string) => {
    // Find the order
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setSelectedOrder(order)
      setIsOrderDetailsModalOpen(true)
    }
  }

  const _handleOpenRoute = (orderId: string) => {
    // Find the order
    const order = orders.find(o => o.id === orderId)
    if (order) {
      // For now, we'll open Google Maps with the address
      // In a real app, this could integrate with a mapping service
      const encodedAddress = encodeURIComponent(order.deliveryAddress)
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
    }
  }

  const handleGetAdminRoute = (order: Order) => {
    try {
      let destination = order.deliveryAddress

      // Если есть координаты, используем их для точной навигации
      if (order.latitude && order.longitude) {
        destination = `${order.latitude},${order.longitude}`
      }

      // Создаем ссылку для навигации от текущего местоположения к точке назначения
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${destination}&travelmode=driving&dir_action=navigate`

      // Открываем ссылку в новой вкладке
      window.open(navigationUrl, '_blank')
    } catch (error) {
      console.error('Error getting route:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <p className="text-xs text-muted-foreground tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }

  const settingsContent = (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <IconButton
          label={profileUiText.changePassword}
          onClick={() => setIsChangePasswordOpen(true)}
          variant="outline"
          iconSize="md"
        >
          <User className="h-4 w-4" />
        </IconButton>
      </div>

      {!isLowAdminView && <SiteBuilderCard />}

      <Card className="">
        <CardHeader>
          <CardTitle>{profileUiText.warehouseStartPoint}</CardTitle>
          <CardDescription>{profileUiText.warehouseStartPointDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="warehousePointSettings">
              {profileUiText.warehouseInputLabel}
              {isWarehouseReadOnly && (
                <span className="ml-2 text-xs text-muted-foreground">{profileUiText.readOnly}</span>
              )}
            </Label>
            <Input
              id="warehousePointSettings"
              value={warehouseInput}
              onChange={(event) => handleWarehouseInputChange(event.target.value)}
              onBlur={() => void handleWarehouseInputBlur()}
              placeholder={profileUiText.warehousePlaceholder}
              disabled={isWarehouseReadOnly || isWarehouseLoading || isWarehouseSaving}
            />
            <div className="text-xs text-muted-foreground">
              {warehousePoint
                ? `${profileUiText.current}: ${warehousePoint.lat.toFixed(6)}, ${warehousePoint.lng.toFixed(6)}`
                : `${profileUiText.current}: ${profileUiText.notConfigured}`}
              {warehousePreview && (
                <span className="ml-2 text-muted-foreground/80">
                  {profileUiText.preview}: {warehousePreview.lat.toFixed(6)}, {warehousePreview.lng.toFixed(6)}
                </span>
              )}
            </div>
          </div>

          <div className="h-48 w-full overflow-hidden rounded-md bg-muted/20">
            <WarehouseStartPointPickerMap
              value={warehousePreview ?? warehousePoint}
              disabled={isWarehouseReadOnly || isWarehouseLoading || isWarehouseSaving}
              onChange={handleWarehouseMapPick}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <IconButton
              label={profileUiText.refresh}
              variant="outline"
              iconSize="md"
              onClick={() => void refreshWarehousePoint()}
              disabled={isWarehouseLoading || isWarehouseSaving}
            >
              <RefreshCw className={isWarehouseLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </IconButton>
            <IconButton
              label={profileUiText.useMyLocation}
              variant="outline"
              iconSize="md"
              onClick={handleUseMyLocation}
              disabled={isWarehouseReadOnly || isWarehouseSaving || isWarehouseLoading || isWarehouseGeoLocating}
            >
              <LocateFixed className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={isWarehouseSaving ? profileUiText.saving : profileUiText.saveLocation}
              iconSize="md"
              onClick={() => void handleSaveWarehousePoint()}
              disabled={isWarehouseReadOnly || isWarehouseSaving || isWarehouseLoading || !warehouseInput.trim()}
            >
              <Save className="h-4 w-4" />
            </IconButton>
          </div>
        </CardContent>
      </Card>
    </>
  )

  return (
    <AdminDashboardShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      visibleTabs={visibleTabs}
      tabsCopy={tabsCopy}
      profileUiText={profileUiText as ProfileUiTextType}
      isMiddleAdminView={isMiddleAdminView}
      isLowAdminView={isLowAdminView}
      currentDate={currentDate}
      isChatOpen={isChatOpen}
      setIsChatOpen={setIsChatOpen}
      isSettingsOpen={isSettingsOpen}
      setIsSettingsOpen={setIsSettingsOpen}
      isChangePasswordOpen={isChangePasswordOpen}
      setIsChangePasswordOpen={setIsChangePasswordOpen}
      handleLogout={handleLogout}
      mode={mode}
      settingsDialogContent={settingsContent}
    >

          {!isMiddleAdminView && (
            <>
              {/* Statistics Tab */}
              <TabsContent value="statistics" className="space-y-5 animate-fade-in">
                <StatisticsTab stats={stats} t={t} />
              </TabsContent>
            </>
          )}

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <OrdersTab
              filteredOrders={filteredOrders}
              selectedOrders={selectedOrders}
              isDeletingOrders={isDeletingOrders}
              isLoading={isLoading}
              isDashboardRefreshing={isDashboardRefreshing}
              selectedDate={selectedDate}
              applySelectedDate={applySelectedDate}
              shiftSelectedDate={shiftSelectedDate}
              selectedPeriodLabel={selectedPeriodLabel}
              selectedPeriod={selectedPeriod}
              applySelectedPeriod={applySelectedPeriod}
              dateLocale={dateLocale}
              selectedDayIsActive={selectedDayIsActive}
              isDispatchOpen={isDispatchOpen}
              setIsDispatchOpen={setIsDispatchOpen}
              searchInputRef={searchInputRef}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showFilters={showFilters}
              filters={filters}
              setFilters={setFilters}
              clearOrderFilters={clearOrderFilters}
              activeFiltersCount={activeFiltersCount}
              t={t}
              profileUiText={profileUiText}
              onRefreshAll={() => void handleRefreshAll()}
              onOpenCreateOrderModal={() => setIsCreateOrderModalOpen(true)}
              onOpenDeleteOrdersDialog={() => setIsDeleteOrdersDialogOpen(true)}
              onSelectOrder={handleOrderSelect}
              onSelectAllOrders={handleSelectAllOrders}
              onViewOrder={(order) => {
                setSelectedOrder(order)
                setIsOrderDetailsModalOpen(true)
              }}
              onEditOrder={handleEditOrder}
            />
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <ClientsTab
              clients={clients}
              orders={orders}
              couriers={couriers}
              availableSets={availableSets}
              processedClients={processedClients}
              filteredClients={filteredClients}
              selectedClients={selectedClients}
              isMutatingClients={isMutatingClients}
              isClientFinanceLoading={isClientFinanceLoading}
              clientFinanceById={clientFinanceById}
              shouldPauseSelectedClients={shouldPauseSelectedClients}
              isLoading={isLoading}
              isDashboardRefreshing={isDashboardRefreshing}
              selectedDate={selectedDate}
              applySelectedDate={applySelectedDate}
              shiftSelectedDate={shiftSelectedDate}
              selectedPeriodLabel={selectedPeriodLabel}
              selectedPeriod={selectedPeriod}
              applySelectedPeriod={applySelectedPeriod}
              dateLocale={dateLocale}
              clientSearchTerm={clientSearchTerm}
              setClientSearchTerm={setClientSearchTerm}
              isCreateClientModalOpen={isCreateClientModalOpen}
              setIsCreateClientModalOpen={setIsCreateClientModalOpen}
              clientFormData={clientFormData}
              setClientFormData={setClientFormData}
              clientSelectedGroupId={clientSelectedGroupId}
              setClientSelectedGroupId={setClientSelectedGroupId}
              clientGroupOptions={clientGroupOptions}
              clientSelectedGroup={clientSelectedGroup}
              clientAssignedSet={clientAssignedSet}
              editingClientId={editingClientId}
              isCreatingClient={isCreatingClient}
              clientError={clientError}
              isDeleteClientsDialogOpen={isDeleteClientsDialogOpen}
              setIsDeleteClientsDialogOpen={setIsDeleteClientsDialogOpen}
              isPauseClientsDialogOpen={isPauseClientsDialogOpen}
              setIsPauseClientsDialogOpen={setIsPauseClientsDialogOpen}
              isResumeClientsDialogOpen={isResumeClientsDialogOpen}
              setIsResumeClientsDialogOpen={setIsResumeClientsDialogOpen}
              clientSortStates={clientSortStates}
              handleClientSortChange={handleClientSortChange}
              clientFilterOpen={clientFilterOpen}
              setClientFilterOpen={setClientFilterOpen}
              clientFilterValues={clientFilterValues}
              handleClientFilterChange={handleClientFilterChange}
              handleClientClearAllFilters={handleClientClearAllFilters}
              clientColumns={clientColumns}
              t={t}
              language={language}
              profileUiText={profileUiText}
              onRefreshAll={() => void handleRefreshAll()}
              onCreateClient={handleCreateClient}
              onOpenCreateClientModal={() => {
                setEditingClientId(null)
                setClientSelectedGroupId('')
                setClientFormData({ ...DEFAULT_CLIENT_FORM })
                setClientError('')
                setIsCreateClientModalOpen(true)
              }}
              onEditClient={handleEditClient}
              onClientAddressChange={(value) => void handleClientAddressChange(value)}
              onDeliveryDayChange={handleDeliveryDayChange}
              onToggleClientSelection={handleToggleClientSelection}
              onToggleClientStatus={handleToggleClientStatus}
              onDeleteSelectedClients={handleDeleteSelectedClients}
              onPauseSelectedClients={handlePauseSelectedClients}
              onResumeSelectedClients={handleResumeSelectedClients}
              onSetSelectedClients={setSelectedClients}
            />
          </TabsContent>

          {isDispatchOpen && (
            <DispatchMapPanel
              open={isDispatchOpen}
              onOpenChange={setIsDispatchOpen}
              orders={dispatchOrders}
              couriers={couriers}
              selectedDateLabel={selectedDate ? selectedDateLabel : profileUiText.allOrders}
              selectedDateISO={selectedDateISO || undefined}
              warehousePoint={warehousePoint}
              onSaved={fetchData}
            />
          )}

          {/* Admins Tab */}
          <AdminsTab 
            lowAdmins={lowAdmins} 
            isLowAdminView={isLowAdminView} 
            onRefresh={fetchData} 
            tabsCopy={tabsCopy} 
            orders={orders}
            selectedDate={selectedDate}
            applySelectedDate={applySelectedDate}
            shiftSelectedDate={shiftSelectedDate}
            selectedDateLabel={selectedPeriodLabel}
            selectedPeriod={selectedPeriod}
            applySelectedPeriod={applySelectedPeriod}
            selectedPeriodLabel={selectedPeriodLabel}
            profileUiText={profileUiText}
          />

          {/* History Tab */}
          <TabsContent value="history" className="space-y-5 animate-fade-in">
            <div className="dense-card">
              <HistoryTable
                role={meRole || 'MIDDLE_ADMIN'}
                limit={50}
                selectedDate={selectedDate}
                applySelectedDate={applySelectedDate}
                shiftSelectedDate={shiftSelectedDate}
                selectedDateLabel={selectedPeriodLabel}
                selectedPeriod={selectedPeriod}
                applySelectedPeriod={applySelectedPeriod}
                selectedPeriodLabel={selectedPeriodLabel}
                profileUiText={profileUiText}
              />
            </div>
          </TabsContent>

          <TabsContent value="bin" className="space-y-4">
            <BinTab
              visibleBinOrders={visibleBinOrders}
              binOrdersSearch={binOrdersSearch}
              setBinOrdersSearch={setBinOrdersSearch}
              isBinOrdersRefreshing={isBinOrdersRefreshing}
              visibleBinClients={visibleBinClients}
              binClientsSearch={binClientsSearch}
              setBinClientsSearch={setBinClientsSearch}
              isBinClientsRefreshing={isBinClientsRefreshing}
              selectedOrders={selectedOrders}
              selectedBinClients={selectedBinClients}
              setSelectedBinClients={setSelectedBinClients}
              onPermanentDeleteOrders={handlePermanentDeleteOrders}
              onRestoreSelectedOrders={handleRestoreSelectedOrders}
              onRefreshBinOrders={() => void handleRefreshBinOrders()}
              onSelectOrder={handleOrderSelect}
              onSelectAllBinOrders={handleSelectAllBinOrders}
              onViewOrder={(order) => {
                setSelectedOrder(order)
                setIsOrderDetailsModalOpen(true)
              }}
              onPermanentDeleteClients={handlePermanentDeleteClients}
              onRestoreSelectedClients={handleRestoreSelectedClients}
              onRefreshBinClients={() => void handleRefreshBinClients()}
              t={t}
              language={language}
              profileUiText={profileUiText}
            />
          </TabsContent>

          {/* Warehouse Tab */}
          <TabsContent value="warehouse" className="space-y-4">
            <WarehouseTab />
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-4">
            <FinanceTab
              selectedDate={selectedDate}
              applySelectedDate={applySelectedDate}
              shiftSelectedDate={shiftSelectedDate}
              selectedDateLabel={selectedPeriodLabel}
              selectedPeriod={selectedPeriod}
              applySelectedPeriod={applySelectedPeriod}
              selectedPeriodLabel={selectedPeriodLabel}
              profileUiText={profileUiText}
            />
          </TabsContent>


        
      {/* Bulk edit modals intentionally removed for compact CRM layout */}

      <AlertDialog open={isDeleteOrdersDialogOpen} onOpenChange={setIsDeleteOrdersDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.deleteSelectedOrders}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.deleteOrdersConfirmation.replace('{count}', String(selectedOrders.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOrders}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingOrders}
              onClick={() => void handleDeleteSelectedOrders({ skipConfirm: true })}
            >
              {isDeletingOrders ? t.common.loading : t.admin.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Details Modal */}
      < Dialog open={isOrderDetailsModalOpen} onOpenChange={setIsOrderDetailsModalOpen} >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.admin.orderDetails} #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              {t.admin.orderFullInfo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {selectedOrder && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-hierarchy">{t.admin.statusLabel}:</span>
                    <Badge
                      variant={
                        selectedOrder.orderStatus === 'DELIVERED'
                          ? "success"
                          : selectedOrder.orderStatus === 'IN_DELIVERY'
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {selectedOrder.orderStatus === 'DELIVERED'
                        ? "Доставлен"
                        : selectedOrder.orderStatus === 'IN_DELIVERY'
                          ? "В доставке"
                          : "Ожидает"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-hierarchy">{t.admin.paymentLabel}:</span>
                    <Badge
                      variant={selectedOrder.paymentStatus === 'PAID' ? "success" : "destructive"}
                    >
                      {selectedOrder.paymentStatus === 'PAID' ? "Оплачен" : "Не оплачен"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-hierarchy">{t.admin.methodLabel}:</span>
                    <span className="text-sm">{selectedOrder.paymentMethod === 'CASH' ? t.admin.statsLabels.cashPayment : t.admin.card}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-hierarchy">{t.admin.quantityLabel}:</span>
                    <span className="text-sm font-bold">{selectedOrder.quantity} {t.admin.portions}.</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-hierarchy">{t.admin.caloriesLabel}:</span>
                    <span className="text-sm">{selectedOrder.calories} {t.admin.kcal}</span>
                  </div>
                </div>

 <div className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.operationalDetails}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-muted-hierarchy">Priority</span>
                    <span>{selectedOrder.priority ?? 3}</span>
                    <span className="text-muted-hierarchy">ETA</span>
                    <span>{selectedOrder.etaMinutes ? `${selectedOrder.etaMinutes} ${t.admin.min}` : '-'}</span>
                    <span className="text-muted-hierarchy">{t.admin.lastChange}</span>
                    <span>
                      {selectedOrder.statusChangedAt
                        ? new Date(selectedOrder.statusChangedAt).toLocaleString('ru-RU')
                        : '-'}
                    </span>
                    <span className="text-muted-hierarchy">{t.admin.assignedCourier}</span>
                    <span>{selectedOrder.assignedAt ? new Date(selectedOrder.assignedAt).toLocaleString('ru-RU') : '-'}</span>
                    <span className="text-muted-hierarchy">{t.admin.deliveryStart}</span>
                    <span>{selectedOrder.pickedUpAt ? new Date(selectedOrder.pickedUpAt).toLocaleString('ru-RU') : '-'}</span>
                    <span className="text-muted-hierarchy">{t.admin.pause}</span>
                    <span>{selectedOrder.pausedAt ? new Date(selectedOrder.pausedAt).toLocaleString('ru-RU') : '-'}</span>
                    <span className="text-muted-hierarchy">{t.admin.completed}</span>
                    <span>{selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleString('ru-RU') : '-'}</span>
                  </div>
                </div>

 <div className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.client}</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-neutral-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-hierarchy" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedOrder.customerName || selectedOrder.customer?.name}</p>
                      <p className="text-xs text-muted-hierarchy">{selectedOrder.customer?.phone}</p>
                    </div>
                  </div>
                </div>

 <div className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.delivery}</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-neutral-400" />
                      <p className="text-sm">{selectedOrder.deliveryAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-400" />
                      <p className="text-sm">{selectedOrder.deliveryTime}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-neutral-400" />
                      <p className="text-sm">
                        {selectedOrder.deliveryDate && new Date(selectedOrder.deliveryDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </div>

 <div className="pt-4 space-y-2">
                  <h4 className="font-semibold text-sm text-primary-hierarchy">Timeline</h4>
                  {isOrderTimelineLoading ? (
                    <p className="text-xs text-muted-foreground">Loading timeline...</p>
                  ) : selectedOrderTimeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events yet</p>
                  ) : (
 <div className="max-h-40 space-y-1 overflow-y-auto rounded bg-muted/20 p-2">
                      {selectedOrderTimeline.map((event) => (
                        <div key={event.id} className="grid grid-cols-[140px_1fr] gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {new Date(event.occurredAt).toLocaleString('ru-RU')}
                          </span>
                          <span>
                            <span className="font-medium">{event.actorName || 'System'}</span>
                            {' - '}
                            {event.message || event.eventType}
                            {event.previousStatus || event.nextStatus
                              ? ` (${event.previousStatus || '-'} → ${event.nextStatus || '-'})`
                              : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedOrder.specialFeatures && (
 <div className="pt-4 space-y-2">
                    <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.features}</h4>
 <p className="text-sm bg-warning-bg p-2 rounded-lg text-warning">
                      {selectedOrder.specialFeatures}
                    </p>
                  </div>
                )}

                {selectedOrder.courierName && (
 <div className="pt-4 space-y-2">
                    <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.courier}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-info-bg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-info" />
                      </div>
                      <p className="text-sm">{selectedOrder.courierName}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDetailsModalOpen(false)}>
              {t.admin.close}
            </Button>
            {selectedOrder && (
              <Button onClick={() => {
                setIsOrderDetailsModalOpen(false)
                handleEditOrder(selectedOrder)
              }}>
                {t.admin.edit}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Create Order Modal */}
      <OrderModal
        open={isCreateOrderModalOpen}
        onOpenChange={setIsCreateOrderModalOpen}
        editingOrderId={editingOrderId}
        setEditingOrderId={setEditingOrderId}
        orderFormData={orderFormData}
        setOrderFormData={setOrderFormData}
        editingOrder={editingOrderId ? (orders.find(o => o.id === editingOrderId) || null) : null}
        clients={clients}
        couriers={couriers}
        availableSets={availableSets}
        orderError={orderError}
        isCreatingOrder={isCreatingOrder}
        onSubmit={handleCreateOrder}
        onClientSelect={handleClientSelect}
        onAddressChange={handleAddressChange}
      />

      {/* Create Courier Modal */}
      < Dialog open={isCreateCourierModalOpen} onOpenChange={setIsCreateCourierModalOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.admin.createCourier}</DialogTitle>
            <DialogDescription>
              {t.admin.createCourierDescription}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCourier}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="courierName" className="text-right">
                  {t.admin.name}
                </Label>
                <Input
                  id="courierName"
                  value={courierFormData.name}
                  onChange={(e) => setCourierFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="courierEmail" className="text-right">
                  Email
                </Label>
                <Input
                  id="courierEmail"
                  type="email"
                  value={courierFormData.email}
                  onChange={(e) => setCourierFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="courierPassword" className="text-right">
                  {t.admin.password}
                </Label>
                <Input
                  id="courierPassword"
                  type="password"
                  value={courierFormData.password}
                  onChange={(e) => setCourierFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            {courierError && (
              <Alert className="mb-4">
                <AlertDescription>{courierError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateCourierModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isCreatingCourier}>
                {isCreatingCourier ? t.admin.creating : t.admin.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminDashboardShell>
  )
}

export default AdminDashboardPage





