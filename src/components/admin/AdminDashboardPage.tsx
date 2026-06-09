'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useAdminSettingsContext } from '@/contexts/AdminSettingsContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconButton } from '@/components/ui/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHeader, sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

const TableFilterPanel = dynamic(
  () => import('@/components/ui/table-filter-panel').then((mod) => mod.TableFilterPanel),
  { ssr: false }
)
// Calendar and Popover are NOT used directly in this component — they are used via CalendarDateSelector → CalendarRangeSelector.
// Removing these dead static imports prevents react-day-picker, date-fns, and @radix-ui/react-popover
// from being pulled into the same chunk as Dialog, which was causing TDZ ReferenceError.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  History,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pause,
  Play,
  Save,
  RefreshCw,
  Filter,
  Sun,
  Moon,
  Monitor,
  Route,
  CalendarDays,
  MapPin,
  LocateFixed,
  CircleUser,
  Settings,
  MessageSquare,
  Edit,
  Clock,
  Truck,
  Database,
  Utensils,
  CookingPot,
} from 'lucide-react'
import { toast } from 'sonner'
// framer-motion removed — was imported but never used in this component's JSX.
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrialStatus } from '@/components/admin/TrialStatus'
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal'
import { SiteBuilderCard } from '@/components/admin/SiteBuilderCard'
import { getDailyPrice, PLAN_TYPES } from '@/lib/menuData'
import { CANONICAL_TABS, deriveVisibleTabs } from '@/components/admin/dashboard/tabs'
import type { Client, Order } from '@/components/admin/dashboard/types'
import { DesktopTabsNav } from '@/components/admin/dashboard/DesktopTabsNav'
import { MobileBottomTabsNav } from '@/components/admin/dashboard/MobileBottomTabsNav'
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData'
import { AdminsTab } from '@/components/admin/dashboard/tabs-content/AdminsTab'
import { OrderModal } from '@/components/admin/dashboard/modals/OrderModal'
import { DispatchMapPanel } from '@/components/admin/orders/DispatchMapPanel'
import { TabEmptyState } from '@/components/admin/dashboard/shared/TabEmptyState'
import { EntityStatusBadge } from '@/components/admin/dashboard/shared/EntityStatusBadge'
// ChatCenter is only rendered when isChatOpen is true — lazy-load it to avoid pulling
// @tambo-ai/react and its heavy dependency chain into the initial admin chunk.
const ChatCenter = dynamic(
  () => import('@/components/chat/ChatCenter').then((mod) => mod.ChatCenter),
  { ssr: false }
)
import {
  expandShortMapsUrl,
  extractCoordsFromText,
  formatLatLng,
  isShortGoogleMapsUrl,
  parseGoogleMapsUrl,
  type LatLng,
} from '@/lib/geo'

import { CalendarDateSelector } from '@/components/admin/dashboard/shared/CalendarDateSelector'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'
import type { DateRange } from 'react-day-picker'

const OrdersTable = dynamic(
  () => import('@/components/admin/OrdersTable').then((mod) => mod.OrdersTable),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div> }
)
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
const MiniLocationPickerMap = dynamic(
  () =>
    import('@/components/admin/dashboard/shared/MiniLocationPickerMap').then(
      (mod) => mod.MiniLocationPickerMap
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
export type AdminDashboardMode = 'middle' | 'low'

const DASHBOARD_UI_STORAGE_PREFIX = 'autofood:dashboard-ui'

const DEFAULT_ORDER_FILTERS = {
  successful: false,
  failed: false,
  pending: false,
  inDelivery: false,
  prepaid: false,
  paid: false,
  unpaid: false,
  card: false,
  cash: false,
  daily: false,
  evenDay: false,
  oddDay: false,
  special: false,
  calories1200: false,
  calories1600: false,
  calories2000: false,
  calories2500: false,
  calories3000: false,
  singleItem: false,
  multiItem: false,
  autoOrders: false,
  manualOrders: false,
}

export function AdminDashboardPage({ mode }: { mode: AdminDashboardMode }) {
  const { t, language } = useLanguage()
  const { settings: adminSettings, updateSettings: updateAdminSettings, mounted: adminSettingsMounted } =
    useAdminSettingsContext()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [activeTab, setActiveTab] = useState(() => (mode === 'middle' ? 'orders' : 'statistics'))
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
  const [bulkOrderUpdates, setBulkOrderUpdates] = useState({
    orderStatus: '',
    paymentStatus: '',
    courierId: '',
    deliveryDate: ''
  })
  const [bulkClientUpdates, setBulkClientUpdates] = useState({
    isActive: undefined as boolean | undefined,
    calories: ''
  })
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
  const [courierFormData, setCourierFormData] = useState({
    name: '',
    email: '',
    password: '',
    salary: ''
  })
  const [clientFormData, setClientFormData] = useState({
    name: '',
    nickName: '',
    phone: '',
    address: '',
    calories: 1200,
    planType: 'CLASSIC' as 'CLASSIC' | 'INDIVIDUAL' | 'DIABETIC',
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
    latitude: null as number | null,
    longitude: null as number | null,
    assignedSetId: ''
  })
  const [clientSelectedGroupId, setClientSelectedGroupId] = useState<string>('')
  const [orderFormData, setOrderFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryTime: '',
    quantity: 1,
    calories: 1200,
    specialFeatures: '',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    isPrepaid: false,
    amountReceived: null as number | null,
    selectedClientId: '',
    latitude: null as number | null,
    longitude: null as number | null,
    courierId: '',
    assignedSetId: ''
  })
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

  const visibleTabs = useMemo(() => {
    const derivedTabs = Array.isArray(allowedTabs)
      ? deriveVisibleTabs(allowedTabs)
      : [...(CANONICAL_TABS as unknown as string[])]

    const withoutInterface = derivedTabs.filter((tab) => tab !== 'interface')
    return isMiddleAdminView ? withoutInterface.filter((tab) => tab !== 'statistics') : withoutInterface
  }, [allowedTabs, isMiddleAdminView])
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

  // Use local (calendar) dates for matching `deliveryDate` (stored as YYYY-MM-DD).
  // Avoid `toISOString()` here, because timezone offsets can shift the day.
  const toLocalIsoDate = useCallback((d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const parseLocalIsoDate = useCallback((iso: string) => {
    const parts = iso.split('-')
    if (parts.length !== 3) return null
    const yyyy = Number(parts[0])
    const mm = Number(parts[1])
    const dd = Number(parts[2])
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
    const dt = new Date(yyyy, mm - 1, dd)
    dt.setHours(0, 0, 0, 0)
    return Number.isNaN(dt.getTime()) ? null : dt
  }, [])

  const isSelectedDateToday = useMemo(() => {
    if (!selectedDate) return false
    const todayISO = toLocalIsoDate(new Date())
    const selectedISO = toLocalIsoDate(selectedDate)
    return selectedISO === todayISO
  }, [selectedDate, toLocalIsoDate])

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
  }, [toLocalIsoDate])

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
        activeTab?: string
        selectedDateISO?: string | null
        selectedPeriodISO?: { from: string; to: string } | null
        showFilters?: boolean
        searchTerm?: string
        clientSearchTerm?: string
        optimizeCourierId?: string
      }

      if (typeof state.activeTab === 'string') setActiveTab(state.activeTab)
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
  }, [applySelectedPeriod, isUiStateHydrated, parseLocalIsoDate, uiStateStorageKey])

  useEffect(() => {
    if (!isUiStateHydrated || typeof window === 'undefined') return

    localStorage.setItem(
      uiStateStorageKey,
      JSON.stringify({
        activeTab,
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
    activeTab,
    clientSearchTerm,
    isUiStateHydrated,
    optimizeCourierId,
    searchTerm,
    selectedPeriod,
    showFilters,
    toLocalIsoDate,
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

  useEffect(() => {
    if (visibleTabs.length === 0) return
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0])
    }
  }, [activeTab, visibleTabs])

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
        setOrderFormData({
          customerName: '',
          customerPhone: '',
          deliveryAddress: '',
          deliveryTime: '',
          quantity: 1,
          calories: 1200,
          specialFeatures: '',
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
          isPrepaid: false,
          amountReceived: null,
          selectedClientId: '',
          latitude: null,
          longitude: null,
          courierId: '',
          assignedSetId: ''
        })
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

  const DispatchActionIcon = !selectedDate
    ? CalendarDays
    : selectedDayIsActive
      ? Save
      : Play
  const dispatchActionLabel = !selectedDate
    ? profileUiText.dispatchChooseDate
    : selectedDayIsActive
      ? profileUiText.dispatchSave
      : profileUiText.dispatchStart

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
 <header className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="page-header h-14">
            <div className="flex items-center gap-4">
              <h1 className="page-header-title text-base">{t.admin.dashboard}</h1>
              <span className="hidden md:block text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground hidden md:block">
                {currentDate || ' '}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                label={
                  adminSettingsMounted
                    ? `${t.admin.theme}: ${
                        adminSettings.theme === 'system'
                          ? t.admin.system
                          : adminSettings.theme === 'dark'
                            ? t.admin.dark
                            : t.admin.light
                      }`
                    : t.admin.theme
                }
                type="button"
                variant="outline"
                iconSize="md"
                onClick={() => {
                  const next =
                    adminSettings.theme === 'light' ? 'dark' : adminSettings.theme === 'dark' ? 'system' : 'light'
                  updateAdminSettings({ theme: next })
                }}
              >
                {adminSettings.theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : adminSettings.theme === 'system' ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </IconButton>
              <LanguageSwitcher />
              <div className="hidden md:block">
                <TrialStatus compact />
              </div>
              {isMiddleAdminView && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:hidden"
                  aria-label={profileUiText.database}
                  title={profileUiText.database}
                >
                  <Link href="/middle-admin/database">
                    <Database className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              {isMiddleAdminView && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex h-9 w-9"
                  aria-label={profileUiText.database}
                  title={profileUiText.database}
                >
                  <Link href="/middle-admin/database">
                    <Database className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Profile" variant="ghost" iconSize="md" className="h-9 w-9">
                    <CircleUser className="h-4 w-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsChatOpen(true)} className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{profileUiText.messages}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)} className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span>{t.admin.settings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()} className="gap-2 text-rose-600 focus:text-rose-600">
                    <LogOut className="h-4 w-4" />
                    <span>{t.common.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        {/* Mobile PWA: full-screen dialog (like dispatch panel). Desktop: centered large modal. */}
 <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none h-[100svh] !rounded-none gap-0 !p-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-[min(98dvh,1560px)] sm:max-w-[min(96vw,1600px)] md:h-[min(98dvh,1800px)] md:max-w-[min(98vw,1800px)] sm:!rounded-3xl">
          <div className="flex h-full min-h-0 flex-col">
 <div className="bg-background/80 px-4 py-3 backdrop-blur">
              <DialogTitle>{profileUiText.messages}</DialogTitle>
              <DialogDescription>{profileUiText.messagesDescription}</DialogDescription>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatCenter />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        {/* Mobile PWA: full-screen dialog. Desktop: centered large modal. */}
 <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none h-[100svh] !rounded-none gap-0 !p-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-[min(98dvh,1560px)] sm:max-w-[min(96vw,1600px)] md:h-[min(98dvh,1800px)] md:max-w-[min(98vw,1800px)] sm:!rounded-3xl">
          <div className="flex h-full min-h-0 flex-col">
 <div className="bg-background/80 px-4 py-3 backdrop-blur">
              <DialogTitle>{t.admin.settings}</DialogTitle>
              <DialogDescription>
                {profileUiText.warehouseStartPoint} / {profileUiText.database}
              </DialogDescription>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-6">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

            <div className="flex flex-col md:flex-row flex-1 py-4 md:py-6 px-2 md:px-4 gap-4 md:gap-6 pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row flex-1 w-full gap-4 md:gap-6">
          <DesktopTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />
          <MobileBottomTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />

          <main className="flex-1 min-w-0">
 <div className="h-full flex flex-col gap-4 md:gap-6 relative overflow-hidden px-4 md:px-6 py-4 md:py-6 bg-surface rounded-xl">

          {!isMiddleAdminView && (
            <>
              {/* Statistics Tab */}
              <TabsContent value="statistics" className="space-y-5 animate-fade-in">
            {/* ── Order Status ── */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.successful} / {t.admin.stats.failed}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: t.admin.stats.successful, value: stats?.successfulOrders || 0, sub: t.admin.statsLabels.delivered, color: 'text-emerald-600', dot: 'bg-emerald-500' },
                  { label: t.admin.stats.failed, value: stats?.failedOrders || 0, sub: t.admin.statsLabels.cancelled, color: 'text-rose-600', dot: 'bg-rose-500' },
                  { label: t.admin.stats.inDelivery, value: stats?.inDeliveryOrders || 0, sub: t.admin.statsLabels.inProgress, color: 'text-blue-600', dot: 'bg-blue-500' },
                  { label: t.admin.stats.pending, value: stats?.pendingOrders || 0, sub: t.admin.statsLabels.inQueue, color: 'text-amber-600', dot: 'bg-amber-500' },
                ].map((s) => (
                  <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                      <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment Stats ── */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.prepaid} / {t.admin.stats.unpaid}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: t.admin.stats.prepaid, value: stats?.prepaidOrders || 0, sub: t.admin.statsLabels.paid, color: 'text-emerald-600', dot: 'bg-emerald-500' },
                  { label: t.admin.stats.unpaid, value: stats?.unpaidOrders || 0, sub: t.admin.statsLabels.onDelivery, color: 'text-rose-600', dot: 'bg-rose-500' },
                  { label: t.admin.stats.card, value: stats?.cardOrders || 0, sub: t.admin.statsLabels.online, color: 'text-blue-600', dot: 'bg-blue-500' },
                  { label: t.admin.stats.cash, value: stats?.cashOrders || 0, sub: t.admin.statsLabels.cashPayment, color: 'text-teal-600', dot: 'bg-teal-500' },
                ].map((s) => (
                  <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                      <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Customer Stats ── */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.daily}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: t.admin.stats.daily, value: stats?.dailyCustomers || 0, sub: 'Каждый день', color: 'text-violet-600', dot: 'bg-violet-500' },
                  { label: t.admin.stats.evenDay, value: stats?.evenDayCustomers || 0, sub: 'Чётные дни', color: 'text-indigo-600', dot: 'bg-indigo-500' },
                  { label: t.admin.stats.oddDay, value: stats?.oddDayCustomers || 0, sub: 'Нечётные дни', color: 'text-pink-600', dot: 'bg-pink-500' },
                  { label: t.admin.stats.special, value: stats?.specialPreferenceCustomers || 0, sub: 'С особенностями', color: 'text-orange-600', dot: 'bg-orange-500' },
                ].map((s) => (
                  <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                      <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Calories ── */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.lowCal}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: t.admin.stats.lowCal, value: stats?.orders1200 || 0, sub: '1200 ккал', color: 'text-rose-600', dot: 'bg-rose-500' },
                  { label: t.admin.stats.standard, value: stats?.orders1600 || 0, sub: '1600 ккал', color: 'text-orange-600', dot: 'bg-orange-500' },
                  { label: t.admin.stats.medium, value: stats?.orders2000 || 0, sub: '2000 ккал', color: 'text-yellow-600', dot: 'bg-yellow-500' },
                  { label: t.admin.stats.high, value: stats?.orders2500 || 0, sub: '2500 ккал', color: 'text-emerald-600', dot: 'bg-emerald-500' },
                  { label: t.admin.stats.max, value: stats?.orders3000 || 0, sub: '3000 ккал', color: 'text-blue-600', dot: 'bg-blue-500' },
                ].map((s) => (
                  <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                      <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                    </div>
                    <div className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Item Count ── */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.admin.stats.single, value: stats?.singleItemOrders || 0, sub: '1 порция', color: 'text-indigo-600', dot: 'bg-indigo-500' },
                { label: t.admin.stats.multi, value: stats?.multiItemOrders || 0, sub: 'Два и более рационов', color: 'text-violet-600', dot: 'bg-violet-500' },
              ].map((s) => (
 <div key={s.label} className="rounded-base bg-card p-4 shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                    <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
              </TabsContent>
            </>
          )}

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
 <Card className="bg-card">
              <CardHeader className="space-y-4 pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>{t.admin.manageOrders}</CardTitle>
                    <CardDescription>
                      {t.admin.manageOrdersDesc}
                    </CardDescription>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
                    <CalendarDateSelector
                      selectedDate={selectedDate}
                      applySelectedDate={applySelectedDate}
                      shiftSelectedDate={shiftSelectedDate}
                      selectedDateLabel={selectedPeriodLabel}
                      selectedPeriod={selectedPeriod}
                      applySelectedPeriod={applySelectedPeriod}
                      showShiftButtons={false}
                      locale={dateLocale}
                      profileUiText={profileUiText}
                    />
                    <RefreshIconButton
                      label={profileUiText.refresh}
                      onClick={() => void handleRefreshAll()}
                      isLoading={isLoading || isDashboardRefreshing}
                      iconSize="md"
                    />
                    <Button
                      onClick={() => setIsCreateOrderModalOpen(true)}
                      size="icon"
                      className="h-9 w-9"
                      aria-label={t.admin.createOrder}
                      title={t.admin.createOrder}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setIsDispatchOpen(true)}
                      disabled={!selectedDate}
                      aria-label={dispatchActionLabel}
                      title={dispatchActionLabel}
                    >
                      <DispatchActionIcon className="size-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setIsDeleteOrdersDialogOpen(true)}
                      disabled={selectedOrders.size === 0 || isDeletingOrders}
                      aria-label={`${t.admin.deleteSelected} (${selectedOrders.size})`}
                      title={`${t.admin.deleteSelected} (${selectedOrders.size})`}
                    >
                      {isDeletingOrders ? (
                        <span className="text-xs">{t.common.loading}</span>
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                    {selectedOrders.size > 0 && (
                      <Badge variant="secondary" className="h-7 px-2 text-xs">
                        {selectedOrders.size}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <SearchPanel
                    inputRef={searchInputRef}
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={profileUiText.searchOrdersPlaceholder}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters Panel */}
                {
                  false && showFilters && (
 <div className="mb-6 p-4 rounded-lg bg-muted">
                      <h3 className="font-medium mb-4">{t.admin.filters}</h3>

                      <div className="space-y-4">
                        {/* Delivery Status */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-hierarchy">{t.admin.filterGroups.deliveryStatus}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.pending} onCheckedChange={(checked) => setFilters({ ...filters, pending: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.pending} (#facc15)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.inDelivery} onCheckedChange={(checked) => setFilters({ ...filters, inDelivery: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.inDelivery} (#3b82f6)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.successful} onCheckedChange={(checked) => setFilters({ ...filters, successful: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.delivered} (#22c55e)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.failed} onCheckedChange={(checked) => setFilters({ ...filters, failed: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.failed} (#ef4444)</span>
                            </label>
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-hierarchy">{t.admin.filterGroups.payment}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.paid} onCheckedChange={(checked) => setFilters({ ...filters, paid: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.paid}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.unpaid} onCheckedChange={(checked) => setFilters({ ...filters, unpaid: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.unpaid}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.prepaid} onCheckedChange={(checked) => setFilters({ ...filters, prepaid: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.prepaid} (⭐)</span>
                            </label>
                            <div className="hidden md:block"></div>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.cash} onCheckedChange={(checked) => setFilters({ ...filters, cash: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.cash}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.card} onCheckedChange={(checked) => setFilters({ ...filters, card: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.card}</span>
                            </label>
                          </div>
                        </div>

                        {/* Calorie Groups */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-hierarchy">{t.admin.filterGroups.calories}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.calories1200} onCheckedChange={(checked) => setFilters({ ...filters, calories1200: checked === true })} />
                              <span className="text-sm">1200</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.calories1600} onCheckedChange={(checked) => setFilters({ ...filters, calories1600: checked === true })} />
                              <span className="text-sm">1600</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.calories2000} onCheckedChange={(checked) => setFilters({ ...filters, calories2000: checked === true })} />
                              <span className="text-sm">2000</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.calories2500} onCheckedChange={(checked) => setFilters({ ...filters, calories2500: checked === true })} />
                              <span className="text-sm">2500</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.calories3000} onCheckedChange={(checked) => setFilters({ ...filters, calories3000: checked === true })} />
                              <span className="text-sm">3000</span>
                            </label>
                          </div>
                        </div>

                        {/* Other filters */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-hierarchy">{t.admin.filterGroups.other}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.autoOrders} onCheckedChange={(checked) => setFilters({ ...filters, autoOrders: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.auto}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.manualOrders} onCheckedChange={(checked) => setFilters({ ...filters, manualOrders: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.manual}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.singleItem} onCheckedChange={(checked) => setFilters({ ...filters, singleItem: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.singlePortion}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <Checkbox checked={filters.multiItem} onCheckedChange={(checked) => setFilters({ ...filters, multiItem: checked === true })} />
                              <span className="text-sm">{t.admin.filterGroups.multiPortion}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

 <div className="rounded-md">
                    <OrdersTable
                      orders={filteredOrders}
                      selectedOrders={selectedOrders}
                      onSelectOrder={handleOrderSelect}
                      onSelectAll={handleSelectAllOrders}
                      onDeleteSelected={() => setIsDeleteOrdersDialogOpen(true)}
                      onViewOrder={(order) => {
                        setSelectedOrder(order)
                        setIsOrderDetailsModalOpen(true)
                      }}
                      onEditOrder={handleEditOrder}
                    />
                  </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
 <Card className="bg-card">
              <CardHeader className="space-y-4 pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>{t.admin.manageClients}</CardTitle>
                    <CardDescription>
                      {t.admin.manageClientsDesc}
                    </CardDescription>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
                    <CalendarDateSelector
                      selectedDate={selectedDate}
                      applySelectedDate={applySelectedDate}
                      shiftSelectedDate={shiftSelectedDate}
                      selectedDateLabel={selectedPeriodLabel}
                      selectedPeriod={selectedPeriod}
                      applySelectedPeriod={applySelectedPeriod}
                      locale={dateLocale}
                      profileUiText={profileUiText}
                    />
                    <RefreshIconButton
                      label={profileUiText.refresh}
                      onClick={() => void handleRefreshAll()}
                      isLoading={isLoading || isDashboardRefreshing}
                      iconSize="md"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        setEditingClientId(null)
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
                            sunday: false,
                          },
                          autoOrdersEnabled: true,
                          isActive: true,
                          defaultCourierId: '',
                          googleMapsLink: '',
                          latitude: null,
                          longitude: null,
                          assignedSetId: '',
                        })
                        setClientError('')
                        setIsCreateClientModalOpen(true)
                      }}
                      aria-label={profileUiText.createClient}
                      title={profileUiText.createClient}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() =>
                        shouldPauseSelectedClients
                          ? setIsPauseClientsDialogOpen(true)
                          : setIsResumeClientsDialogOpen(true)
                      }
                      disabled={selectedClients.size === 0 || isMutatingClients}
                      aria-label={shouldPauseSelectedClients ? t.admin.pause : t.admin.resume}
                      title={shouldPauseSelectedClients ? t.admin.pause : t.admin.resume}
                    >
                      {shouldPauseSelectedClients ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setIsDeleteClientsDialogOpen(true)}
                      disabled={selectedClients.size === 0 || isMutatingClients}
                      aria-label={`${t.admin.deleteSelected} (${selectedClients.size})`}
                      title={`${t.admin.deleteSelected} (${selectedClients.size})`}
                    >
                      {isMutatingClients ? (
                        <span className="text-xs">{t.common.loading}</span>
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                    {selectedClients.size > 0 && (
                      <Badge variant="secondary" className="h-7 px-2 text-xs">
                        {selectedClients.size}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <SearchPanel
                    value={clientSearchTerm}
                    onChange={setClientSearchTerm}
                    placeholder={profileUiText.searchClientPlaceholder}
                  />
                  <TableFilterPanel
                    open={clientFilterOpen}
                    onOpenChange={setClientFilterOpen}
                    columns={clientFilterColumns}
                    filters={clientFilterValues}
                    onFilterChange={handleClientFilterChange}
                    onClearAll={handleClientClearAllFilters}
                    title={language === 'ru' ? 'Фильтры клиентов' : language === 'uz' ? 'Mijozlar filtrlari' : 'Client Filters'}
                  />
                </div>
                    <Dialog open={isCreateClientModalOpen} onOpenChange={setIsCreateClientModalOpen}>
                      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingClientId ? profileUiText.editClient : profileUiText.createClient}</DialogTitle>
                          <DialogDescription>
                            {editingClientId ? profileUiText.updateClientDetails : profileUiText.createClientDescription}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateClient}>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientName" className="text-right">
                                {t.common.name}
                              </Label>
                              <Input
                                id="clientName"
                                value={clientFormData.name}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientNickName" className="text-right">
                                {profileUiText.nickname}
                              </Label>
                              <Input
                                id="clientNickName"
                                value={clientFormData.nickName || ''}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, nickName: e.target.value }))}
                                className="col-span-3"
                                placeholder={profileUiText.nicknamePlaceholder}
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientPhone" className="text-right">
                                {t.common.phone}
                              </Label>
                              <div className="col-span-3">
                                <Input
                                  id="clientPhone"
                                  type="tel"
                                  placeholder="+998 XX XXX XX XX"
                                  value={clientFormData.phone}
                                  onChange={(e) => setClientFormData(prev => ({ ...prev, phone: e.target.value }))}
                                  required
                                />
                                <p className="text-xs text-muted-foreground mt-1">{profileUiText.phoneFormat}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientAddress" className="text-right">
                                {t.common.address}
                              </Label>
                              <Input
                                id="clientAddress"
                                value={clientFormData.address}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="googleMapsLink" className="text-right">
                                {profileUiText.mapLink}
                              </Label>

                              <Input
                                id="googleMapsLink"
                                placeholder="https://maps.google.com/..."
                                value={clientFormData.googleMapsLink || ''}
                                onChange={(e) => handleClientAddressChange(e.target.value)}
                                className="col-span-3"
                              />
                            </div>

                            <div className="grid grid-cols-4 items-start gap-2">
                              <Label className="text-right">{profileUiText.map}</Label>
                              <div className="col-span-3 space-y-2">
 <div className="rounded-xl overflow-hidden bg-card">
                                  <div className="h-[190px] w-full">
                                    <MiniLocationPickerMap
                                      value={
                                        typeof clientFormData.latitude === 'number' && typeof clientFormData.longitude === 'number'
                                          ? { lat: clientFormData.latitude, lng: clientFormData.longitude }
                                          : null
                                      }
                                      onChange={(point) => void handleClientAddressChange(formatLatLng(point))}
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {profileUiText.mapHint}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientPlanType" className="text-right">
                                Plan
                              </Label>
                              <div className="col-span-3">
                                <Select
                                  value={clientFormData.planType}
                                  onValueChange={(value) => {
                                    const val = value as any
                                    setClientFormData(prev => ({
                                      ...prev,
                                      planType: val,
                                      dailyPrice: prev.assignedSetId ? prev.dailyPrice : getDailyPrice(val, prev.calories)
                                    }))
                                  }}
                                >
                                  <SelectTrigger id="clientPlanType" className="w-full">
                                    <SelectValue placeholder="Plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PLAN_TYPES).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientSet" className="text-right">
                                Set
                              </Label>
                              <div className="col-span-3">
                                <Select
                                  value={clientFormData.assignedSetId || '__auto__'}
                                  onValueChange={(value) => {
                                    setClientSelectedGroupId('')
                                    setClientFormData((prev) => ({
                                      ...prev,
                                      assignedSetId: value === '__auto__' ? '' : value,
                                    }))
                                  }}
                                >
                                  <SelectTrigger id="clientSet" className="w-full">
                                    <SelectValue placeholder={profileUiText.autoSet} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__auto__">{profileUiText.autoSet}</SelectItem>
                                    {availableSets.map((set) => (
                                      <SelectItem key={set.id} value={set.id}>
                                        {set.name} {set.isActive ? profileUiText.active : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientGroup" className="text-right">
                                Group
                              </Label>
                              <div className="col-span-3">
                                <Select
                                  value={clientSelectedGroupId || '__none__'}
                                  onValueChange={(value) => {
                                    if (value === '__none__') return
                                    const g = clientGroupOptions.find((x) => x.id === value)
                                    if (!g) return
                                    setClientSelectedGroupId(g.id)
                                    setClientFormData((prev) => ({
                                      ...prev,
                                      dailyPrice:
                                        typeof g.price === 'number' && Number.isFinite(g.price) ? g.price : prev.dailyPrice,
                                    }))
                                  }}
                                  disabled={!clientAssignedSet || clientGroupOptions.length === 0}
                                >
                                  <SelectTrigger id="clientGroup" className="w-full">
                                    <SelectValue placeholder={clientAssignedSet ? 'Select group' : 'Select set first'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">{clientAssignedSet ? 'Select group' : 'Select set first'}</SelectItem>
                                    {clientGroupOptions.map((g) => (
                                      <SelectItem key={g.id} value={g.id}>
                                        {g.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientPrice" className="text-right">
                                Price (UZS)
                              </Label>
                              <Input
                                id="clientPrice"
                                type="number"
                                value={clientSelectedGroup ? clientFormData.dailyPrice : ''}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, dailyPrice: parseInt(e.target.value) }))}
                                className="col-span-3"
                                disabled={!clientSelectedGroup}
                                placeholder={clientSelectedGroup ? undefined : 'Select group'}
                              />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientNotes" className="text-right">
                                Notes
                              </Label>
                              <Input
                                id="clientNotes"
                                value={clientFormData.notes || ''}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="col-span-3"
                                placeholder="Individual preferences..."
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor="clientSpecialFeatures" className="text-right">
                                Special features
                              </Label>
                              <Input
                                id="clientSpecialFeatures"
                                value={clientFormData.specialFeatures}
                                onChange={(e) => setClientFormData(prev => ({ ...prev, specialFeatures: e.target.value }))}
                                className="col-span-3"
                                placeholder="Special requests (optional)"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-2">
                              <Label className="text-right pt-2">
                                Delivery days
                              </Label>
                              <div className="col-span-3 space-y-2">
                                <div className="text-xs text-muted-hierarchy mb-2">
                                  Select weekdays for automatic order creation
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="monday"
                                      checked={clientFormData.deliveryDays.monday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('monday', checked === true)}
                                    />
                                    <Label htmlFor="monday" className="text-sm">Monday</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="tuesday"
                                      checked={clientFormData.deliveryDays.tuesday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('tuesday', checked === true)}
                                    />
                                    <Label htmlFor="tuesday" className="text-sm">Tuesday</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="wednesday"
                                      checked={clientFormData.deliveryDays.wednesday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('wednesday', checked === true)}
                                    />
                                    <Label htmlFor="wednesday" className="text-sm">Wednesday</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="thursday"
                                      checked={clientFormData.deliveryDays.thursday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('thursday', checked === true)}
                                    />
                                    <Label htmlFor="thursday" className="text-sm">Thursday</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="friday"
                                      checked={clientFormData.deliveryDays.friday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('friday', checked === true)}
                                    />
                                    <Label htmlFor="friday" className="text-sm">Friday</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="saturday"
                                      checked={clientFormData.deliveryDays.saturday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('saturday', checked === true)}
                                    />
                                    <Label htmlFor="saturday" className="text-sm">Saturday</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="sunday"
                                      checked={clientFormData.deliveryDays.sunday}
                                      onCheckedChange={(checked) => handleDeliveryDayChange('sunday', checked === true)}
                                    />
                                    <Label htmlFor="sunday" className="text-sm">Sunday</Label>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <Label htmlFor="defaultCourier" className="text-sm w-full">
                                    Default courier:
                                    <Select
                                      value={clientFormData.defaultCourierId || '__none__'}
                                      onValueChange={(value) => setClientFormData(prev => ({ ...prev, defaultCourierId: value === '__none__' ? '' : value }))}
                                    >
                                      <SelectTrigger id="defaultCourier" className="mt-1 w-full">
                                        <SelectValue placeholder="None" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {couriers.map((courier) => (
                                          <SelectItem key={courier.id} value={courier.id}>
                                            {courier.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <Checkbox
                                    id="autoOrdersEnabled"
                                    checked={clientFormData.autoOrdersEnabled}
                                    onCheckedChange={(checked) => setClientFormData(prev => ({ ...prev, autoOrdersEnabled: checked === true }))}
                                  />
                                  <Label htmlFor="autoOrdersEnabled" className="text-sm">
                                    {profileUiText.enableAutoOrderCreation}
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                          {clientError && (
                            <Alert className="mb-4">
                              <AlertDescription>{clientError}</AlertDescription>
                            </Alert>
                          )}
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateClientModalOpen(false)}>
                              {t.common.cancel}
                            </Button>
                            <Button type="submit" disabled={isCreatingClient}>
                              {isCreatingClient ? profileUiText.saving : (editingClientId ? t.common.save : t.admin.create)}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
              </CardHeader>
              <CardContent>
 {/* Clients Table */}
 <div className="rounded-xl">
                   <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="dense-row-header">
                          <TableHead className="w-[44px] px-2 py-0">
                            <Checkbox
                              aria-label="Select all clients"
                              checked={
                                processedClients.length > 0 && selectedClients.size === processedClients.length
                                  ? true
                                  : selectedClients.size > 0
                                    ? 'indeterminate'
                                    : false
                              }
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setSelectedClients(new Set(processedClients.map((c) => c.id)))
                                } else {
                                  setSelectedClients(new Set())
                                }
                              }}
                            />
                          </TableHead>
                          <SortableTableHeader column={clientColumns[0]} sortState={clientSortStates['name'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[1]} sortState={clientSortStates['nickname'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[2]} sortState={clientSortStates['phone'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[3]} sortState={clientSortStates['balance'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0 text-right" />
                          <SortableTableHeader column={clientColumns[4]} sortState={clientSortStates['days'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0 text-right" />
                          <SortableTableHeader column={clientColumns[5]} sortState={clientSortStates['address'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[6]} sortState={clientSortStates['calories'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[7]} sortState={clientSortStates['orders'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0 text-center" />
                          <SortableTableHeader column={clientColumns[8]} sortState={clientSortStates['deliveryDays'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[9]} sortState={clientSortStates['status'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[10]} sortState={clientSortStates['notes'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <SortableTableHeader column={clientColumns[11]} sortState={clientSortStates['created'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                          <TableHead className="py-0 text-right">{t.admin.table.actions}</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {processedClients.map((client) => (
                          <TableRow key={client.id} className="dense-row">
                            <TableCell className="px-2 py-0">
                              <Checkbox
                                aria-label={`Select client ${client.name}`}
                                checked={selectedClients.has(client.id)}
                                onCheckedChange={() => handleToggleClientSelection(client.id)}
                              />
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate py-0 font-medium text-primary-hierarchy" title={client.name}>
                              {client.name}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate py-0 text-muted-hierarchy" title={client.nickName || ''}>
                              {client.nickName || '-'}
                            </TableCell>
                            <TableCell className="py-0 text-secondary-hierarchy">{client.phone}</TableCell>
                            <TableCell className="py-0 text-right tabular-nums">
                              {(() => {
                                const finance = clientFinanceById[client.id]
                                if (!finance || !Number.isFinite(finance.balance)) return isClientFinanceLoading ? '...' : '-'
                                const balance = Math.round(finance.balance)
                                return (
                                  <span className={balance < 0 ? 'font-medium text-danger' : 'font-medium text-success'}>
                                    {balance.toLocaleString(dateLocale)} UZS
                                  </span>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="py-0 text-right tabular-nums">
                              {(() => {
                                const finance = clientFinanceById[client.id]
                                if (!finance || !Number.isFinite(finance.balance)) return isClientFinanceLoading ? '...' : '-'
                                const daily = finance.dailyPrice || client.dailyPrice || 0
                                if (!daily || daily <= 0) return '-'
                                const days = Math.floor(finance.balance / daily)
                                return (
                                  <span className={days < 0 ? 'font-medium text-danger' : 'font-medium text-muted-hierarchy'}>
                                    {days}
                                  </span>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="max-w-[320px] truncate py-0 text-secondary-hierarchy" title={client.address}>
                              {client.address}
                            </TableCell>
                            <TableCell className="py-0 text-secondary-hierarchy">{client.calories} kcal</TableCell>
                            <TableCell className="py-0 text-center">
                              {(() => {
                                const clientOrders = orders.filter((o) => o.customerPhone === client.phone)
                                if (clientOrders.length === 0) return <span className="text-muted-hierarchy">-</span>
                                const delivered = clientOrders.filter((o) => o.orderStatus === 'DELIVERED').length
                                const active = clientOrders.filter((o) => ['NEW','PENDING','IN_PROCESS','IN_DELIVERY','PAUSED'].includes(o.orderStatus)).length
                                const failed = clientOrders.length - delivered - active
                                return (
                                  <div className="flex items-center justify-center gap-2 text-xs">
                                    {delivered > 0 && <span className="font-bold text-success" title="Delivered">{delivered}</span>}
                                    {failed > 0 && <span className="font-bold text-danger" title="Failed/Not Delivered">{failed}</span>}
                                    {active > 0 && <span className="font-bold text-warning" title="Active">{active}</span>}
                                  </div>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="py-0">
                              <div className="text-xs flex flex-wrap gap-0.5">
                                {client.deliveryDays?.monday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Mon</Badge>}
                                {client.deliveryDays?.tuesday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Tue</Badge>}
                                {client.deliveryDays?.wednesday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Wed</Badge>}
                                {client.deliveryDays?.thursday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Thu</Badge>}
                                {client.deliveryDays?.friday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Fri</Badge>}
                                {client.deliveryDays?.saturday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Sat</Badge>}
                                {client.deliveryDays?.sunday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Sun</Badge>}
                                {(!client.deliveryDays || Object.values(client.deliveryDays).every((day) => !day)) && (
                                  <span className="text-muted-hierarchy">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <EntityStatusBadge
                                isActive={client.isActive}
                                activeLabel={t.admin.table.active}
                                inactiveLabel={t.admin.table.paused}
                                inactiveTone="danger"
                                showDot
                                onClick={() => handleToggleClientStatus(client.id, client.isActive)}
                              />
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate py-0 text-muted-hierarchy" title={client.specialFeatures || ''}>
                              {client.specialFeatures || '-'}
                            </TableCell>
                            <TableCell className="py-0 text-muted-hierarchy">{new Date(client.createdAt).toLocaleDateString('en-GB')}</TableCell>
                            <TableCell className="py-0 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClient(client)}>
                                <Edit className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {processedClients.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={14} className="h-24 text-center">
                              <div className="empty-state py-0">
                                <p className="empty-state-title">{language === 'ru' ? 'Клиенты не найдены' : language === 'uz' ? 'Mijozlar topilmadi' : 'No clients found'}</p>
                                <p className="empty-state-desc">{language === 'ru' ? 'Измените фильтры или поисковый запрос.' : language === 'uz' ? 'Filtrlar yoki qidiruv so\'rovini o\'zgartiring.' : 'Adjust the filters or search query.'}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent >

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

          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
          />

          <TabsContent value="bin" className="space-y-4">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList>
                <TabsTrigger value="orders">{t.admin.deletedOrders}</TabsTrigger>
                <TabsTrigger value="clients">{t.admin.deletedClients}</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">{profileUiText.ordersBin}</h2>
                  {/* Orders-tab style: wrap on mobile so actions never disappear off-screen. */}
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                    <div className="relative">
                      <IconButton
                        label={`${t.admin.deleteSelected} (${selectedOrders.size})`}
                        onClick={handlePermanentDeleteOrders}
                        variant="destructive"
                        disabled={selectedOrders.size === 0}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                      {selectedOrders.size > 0 ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-background px-1 text-[11px] font-semibold text-foreground">
                          {selectedOrders.size}
                        </span>
                      ) : null}
                    </div>

                    <div className="relative">
                      <IconButton
                        label={`${t.admin.restoreSelected} (${selectedOrders.size})`}
                        onClick={handleRestoreSelectedOrders}
                        variant="outline"
                        disabled={selectedOrders.size === 0}
                      >
                        <History className="size-4" />
                      </IconButton>
                      {selectedOrders.size > 0 ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background">
                          {selectedOrders.size}
                        </span>
                      ) : null}
                    </div>

                    <RefreshIconButton
                      label={profileUiText.refresh}
                      onClick={() => void handleRefreshBinOrders()}
                      isLoading={isBinOrdersRefreshing}
                      iconSize="md"
                    />

                    <SearchPanel
                      value={binOrdersSearch}
                      onChange={setBinOrdersSearch}
                      placeholder={t.admin.searchPlaceholder}
                      className="w-full sm:w-[260px] md:w-[320px] flex-none basis-full sm:basis-auto"
                    />
                  </div>
                </div>

 <div className="rounded-md">
                  <OrdersTable
                    orders={visibleBinOrders}
                    selectedOrders={selectedOrders}
                    onSelectOrder={handleOrderSelect}
                    onSelectAll={handleSelectAllBinOrders}
                    onDeleteSelected={handlePermanentDeleteOrders}
                    onViewOrder={(order) => {
                      setSelectedOrder(order)
                      setIsOrderDetailsModalOpen(true)
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="clients" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">{profileUiText.clientsBin}</h2>
                  {/* Orders-tab style: wrap on mobile so actions never disappear off-screen. */}
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                    <div className="relative">
                      <IconButton
                        label={`${t.admin.deleteSelected} (${selectedBinClients.size})`}
                        onClick={handlePermanentDeleteClients}
                        variant="destructive"
                        disabled={selectedBinClients.size === 0}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                      {selectedBinClients.size > 0 ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-background px-1 text-[11px] font-semibold text-foreground">
                          {selectedBinClients.size}
                        </span>
                      ) : null}
                    </div>

                    <div className="relative">
                      <IconButton
                        label={`${t.admin.restoreSelected} (${selectedBinClients.size})`}
                        onClick={handleRestoreSelectedClients}
                        variant="outline"
                        disabled={selectedBinClients.size === 0}
                      >
                        <History className="size-4" />
                      </IconButton>
                      {selectedBinClients.size > 0 ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background">
                          {selectedBinClients.size}
                        </span>
                      ) : null}
                    </div>

                    <RefreshIconButton
                      label={profileUiText.refresh}
                      onClick={() => void handleRefreshBinClients()}
                      isLoading={isBinClientsRefreshing}
                      iconSize="md"
                    />

                    <SearchPanel
                      value={binClientsSearch}
                      onChange={setBinClientsSearch}
                      placeholder={t.admin.searchPlaceholder}
                      className="w-full sm:w-[260px] md:w-[320px] flex-none basis-full sm:basis-auto"
                    />
                  </div>
                </div>

 <div className="rounded-md">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
 <thead className="">
 <tr className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            <Checkbox
                              checked={
                                visibleBinClients.length > 0 &&
                                visibleBinClients.every((c: any) => selectedBinClients.has(c.id))
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBinClients((current) => new Set([
                                    ...Array.from(current),
                                    ...visibleBinClients.map((c: any) => c.id),
                                  ]))
                                } else {
                                  setSelectedBinClients((current) => {
                                    const next = new Set(current)
                                    visibleBinClients.forEach((c: any) => next.delete(c.id))
                                    return next
                                  })
                                }
                              }}
                            />
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.name}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.phone}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.address}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.common.date}</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t.admin.table.role}</th>
                        </tr>
                      </thead>
 <tbody className="">
                        {visibleBinClients.map((client: any) => (
 <tr key={client.id} className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedBinClients.has(client.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedBinClients)
                                  if (checked) {
                                    newSelected.add(client.id)
                                  } else {
                                    newSelected.delete(client.id)
                                  }
                                  setSelectedBinClients(newSelected)
                                }}
                              />
                            </td>
                            <td className="p-4 align-middle font-medium">{client.name}</td>
                            <td className="p-4 align-middle">{client.phone}</td>
                            <td className="p-4 align-middle">{client.address}</td>
                            <td className="p-4 align-middle">
                              {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US') : '-'}
                            </td>
                            <td className="p-4 align-middle">{client.deletedBy || '-'}</td>
                          </tr>
                        ))}
                        {visibleBinClients.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              {t.finance.noClients}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

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

      <AlertDialog open={isPauseClientsDialogOpen} onOpenChange={setIsPauseClientsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.pauseSelectedClients}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.pauseClientsConfirmation.replace('{count}', String(selectedClients.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingClients}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingClients}
              onClick={() => void handlePauseSelectedClients({ skipConfirm: true })}
            >
              {isMutatingClients ? t.common.loading : t.admin.pause}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResumeClientsDialogOpen} onOpenChange={setIsResumeClientsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.resumeSelectedClients}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.resumeClientsConfirmation.replace('{count}', String(selectedClients.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingClients}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingClients}
              onClick={() => void handleResumeSelectedClients({ skipConfirm: true })}
            >
              {isMutatingClients ? t.common.loading : t.admin.resume}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteClientsDialogOpen} onOpenChange={setIsDeleteClientsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.deleteSelectedClients}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.deleteClientsConfirmation.replace('{count}', String(selectedClients.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingClients}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingClients}
              onClick={() => void handleDeleteSelectedClients({ skipConfirm: true })}
            >
              {isMutatingClients ? t.common.loading : t.admin.delete}
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
            </div>{/* end content-card */}
          </main>
        </Tabs>
      </div>{/* end flex container */}
    </div>
  )
}

export default AdminDashboardPage





