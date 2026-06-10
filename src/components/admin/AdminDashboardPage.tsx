'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  LocateFixed,
} from 'lucide-react'
import { toast } from 'sonner'
// framer-motion removed — was imported but never used in this component's JSX.
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminDashboardShell } from '@/features/admin-dashboard/shell'
import type { ProfileUiText as ProfileUiTextType } from '@/features/admin-dashboard/shell'
import { getProfileUiText, type ProfileUiText } from '@/features/admin-dashboard/config/profile-ui-text'
import { useWarehousePoint } from '@/features/admin-dashboard/hooks/useWarehousePoint'
import { SiteBuilderCard } from '@/components/admin/SiteBuilderCard'

import type { AdminDashboardMode, Client, Order, OrderTimelineEvent, ClientFinanceById } from '@/features/admin-dashboard/model'
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
  getDateLocale,
  getClientGroupOptions,
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
  parseGoogleMapsUrl,
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
const OrderDetailsModal = dynamic(
  () => import('@/features/admin-dashboard/modals/OrderDetailsModal').then(m => ({ default: m.OrderDetailsModal })),
  { ssr: false }
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
  const [clientFinanceById, setClientFinanceById] = useState<ClientFinanceById>({})
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
  const [selectedOrderTimeline, setSelectedOrderTimeline] = useState<OrderTimelineEvent[]>([])
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

  const clientGroupOptions = useMemo(
    () => getClientGroupOptions(clientAssignedSet),
    [clientAssignedSet]
  )

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
      .then((res) => {
        if (controller.signal.aborted) return
        const data = res?.data
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

  const dateLocale = getDateLocale(language)
  const profileUiText = useMemo(() => getProfileUiText(language), [language])

  const {
    warehousePoint,
    warehouseInput,
    warehousePreview,
    isWarehouseLoading,
    isWarehouseSaving,
    isWarehouseGeoLocating,
    refreshWarehousePoint,
    handleWarehouseInputChange,
    handleWarehouseInputBlur,
    handleWarehouseMapPick,
    handleUseMyLocation,
    handleSaveWarehousePoint,
  } = useWarehousePoint({
    isReadOnly: isWarehouseReadOnly,
    profileUiText,
    errorSavingWarehouse: t.admin.toasts.errorSavingWarehouse,
    warehouseSaved: t.admin.toasts.warehouseSaved,
    enterMapsLinkOrCoords: t.admin.toasts.enterMapsLinkOrCoords,
  })

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
      .then((json) => {
        if (cancelled) return
        const data = json?.data ?? json
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
      <OrderDetailsModal
        open={isOrderDetailsModalOpen}
        onOpenChange={setIsOrderDetailsModalOpen}
        order={selectedOrder}
        timeline={selectedOrderTimeline}
        isTimelineLoading={isOrderTimelineLoading}
        t={t}
        onEdit={handleEditOrder}
      />

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





