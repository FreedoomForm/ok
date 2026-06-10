'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { parseGoogleMapsUrl } from '@/modules/shared/geo'
import {
  toLocalIsoDate,
  getClientGroupOptions,
  DEFAULT_COURIER_FORM,
  DEFAULT_CLIENT_FORM,
  DEFAULT_ORDER_FORM,
  DEFAULT_BULK_ORDER_UPDATES,
  DEFAULT_BULK_CLIENT_UPDATES,
  DEFAULT_ORDER_FILTERS,
  type Order,
  type Client,
  type ClientFormData,
  type OrderFormData,
  type BulkOrderUpdates,
  type BulkClientUpdates,
  type OrderFilters,
  type ClientFinanceById,
  type OrderTimelineEvent,
} from '@/features/admin-dashboard/model'
import { sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

// ---------------------------------------------------------------------------
// Input — values the parent page must supply
// ---------------------------------------------------------------------------
export interface UseDashboardActionsInput {
  t: any
  language: string
  isLowAdminView: boolean
  isMiddleAdminView: boolean
  fetchData: () => void
  fetchBinOrders: () => void
  fetchBinClients: () => void
  orders: Order[]
  setOrders: (orders: Order[]) => void
  clients: Client[]
  binClients: any[]
  binOrders: any[]
  selectedDate: Date | null
  searchTerm: string
  clientSearchTerm: string
  activeTab: string
  availableSets: any[]
  profileUiText: any
}

// ---------------------------------------------------------------------------
// Output — state + handlers the page and child components need
// ---------------------------------------------------------------------------
export interface UseDashboardActionsReturn {
  // --- Selection state ---
  selectedOrders: Set<string>
  setSelectedOrders: React.Dispatch<React.SetStateAction<Set<string>>>
  selectedClients: Set<string>
  setSelectedClients: React.Dispatch<React.SetStateAction<Set<string>>>
  selectedBinClients: Set<string>
  setSelectedBinClients: React.Dispatch<React.SetStateAction<Set<string>>>

  // --- Dialog open/close ---
  isDeleteOrdersDialogOpen: boolean
  setIsDeleteOrdersDialogOpen: (v: boolean) => void
  isDeleteClientsDialogOpen: boolean
  setIsDeleteClientsDialogOpen: (v: boolean) => void
  isPauseClientsDialogOpen: boolean
  setIsPauseClientsDialogOpen: (v: boolean) => void
  isResumeClientsDialogOpen: boolean
  setIsResumeClientsDialogOpen: (v: boolean) => void
  isCreateOrderModalOpen: boolean
  setIsCreateOrderModalOpen: (v: boolean) => void
  isCreateCourierModalOpen: boolean
  setIsCreateCourierModalOpen: (v: boolean) => void
  isCreateClientModalOpen: boolean
  setIsCreateClientModalOpen: (v: boolean) => void
  isBulkEditOrdersModalOpen: boolean
  setIsBulkEditOrdersModalOpen: (v: boolean) => void
  isBulkEditClientsModalOpen: boolean
  setIsBulkEditClientsModalOpen: (v: boolean) => void
  isOrderDetailsModalOpen: boolean
  setIsOrderDetailsModalOpen: (v: boolean) => void

  // --- Loading flags ---
  isDeletingOrders: boolean
  isMutatingClients: boolean
  isUpdatingBulk: boolean
  isCreatingOrder: boolean
  isCreatingClient: boolean
  isDashboardRefreshing: boolean
  isBinOrdersRefreshing: boolean
  isBinClientsRefreshing: boolean
  isClientFinanceLoading: boolean

  // --- Form data ---
  orderFormData: OrderFormData
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>
  editingOrderId: string | null
  setEditingOrderId: React.Dispatch<React.SetStateAction<string | null>>
  orderError: string
  clientFormData: ClientFormData
  setClientFormData: React.Dispatch<React.SetStateAction<ClientFormData>>
  editingClientId: string | null
  setEditingClientId: React.Dispatch<React.SetStateAction<string | null>>
  clientError: string
  setClientError: React.Dispatch<React.SetStateAction<string>>
  clientSelectedGroupId: string
  setClientSelectedGroupId: (v: string) => void
  bulkOrderUpdates: BulkOrderUpdates
  setBulkOrderUpdates: React.Dispatch<React.SetStateAction<BulkOrderUpdates>>
  bulkClientUpdates: BulkClientUpdates
  setBulkClientUpdates: React.Dispatch<React.SetStateAction<BulkClientUpdates>>
  filters: OrderFilters
  setFilters: React.Dispatch<React.SetStateAction<OrderFilters>>

  // --- Selected order detail ---
  selectedOrder: Order | null
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | null>>
  selectedOrderTimeline: OrderTimelineEvent[]
  setSelectedOrderTimeline: React.Dispatch<React.SetStateAction<OrderTimelineEvent[]>>
  isOrderTimelineLoading: boolean

  // --- Bin state ---
  binOrdersSearch: string
  setBinOrdersSearch: (v: string) => void
  binClientsSearch: string
  setBinClientsSearch: (v: string) => void
  visibleBinOrders: any[]
  visibleBinClients: any[]

  // --- Client finance ---
  clientFinanceById: ClientFinanceById

  // --- Client sort/filter ---
  clientSortStates: Record<string, SortState>
  clientFilterOpen: boolean
  setClientFilterOpen: (v: boolean) => void
  clientFilterValues: Record<string, string>
  handleClientSortChange: (key: string, state: SortState) => void
  handleClientFilterChange: (key: string, value: string) => void
  handleClientClearAllFilters: () => void
  clientColumns: SortableColumn[]
  processedClients: Client[]

  // --- Computed ---
  selectedClientsSnapshot: Client[]
  shouldPauseSelectedClients: boolean
  activeFiltersCount: number
  clientAssignedSet: any
  clientGroupOptions: any[]
  clientSelectedGroup: any
  filteredOrders: Order[]
  filteredClients: Client[]
  normalizedOrdersForSelectedDate: Order[]

  // --- Handlers ---
  handleRefreshAll: () => Promise<void>
  handleRefreshBinOrders: () => Promise<void>
  handleRefreshBinClients: () => Promise<void>
  handleOrderSelect: (orderId: string) => void
  handleSelectAllOrders: () => void
  handleDeleteSelectedOrders: (opts?: { skipConfirm?: boolean }) => Promise<void>
  handlePermanentDeleteOrders: () => Promise<void>
  handleRestoreSelectedOrders: () => Promise<void>
  handleSelectAllBinOrders: () => void
  handlePermanentDeleteClients: () => Promise<void>
  handleAddressChange: (value: string) => Promise<void>
  handleClientAddressChange: (value: string) => Promise<void>
  handleClientSelect: (clientId: string) => void
  handleCreateOrder: (e: React.FormEvent) => Promise<void>
  handleEditOrder: (order: Order) => void
  handleCreateClient: (e: React.FormEvent) => Promise<void>
  handleEditClient: (client: Client) => void
  handleToggleClientStatus: (clientId: string, currentStatus: boolean) => Promise<void>
  handleToggleClientSelection: (clientId: string) => void
  handleDeleteSelectedClients: (opts?: { skipConfirm?: boolean }) => Promise<void>
  handlePauseSelectedClients: (opts?: { skipConfirm?: boolean }) => Promise<void>
  handleResumeSelectedClients: (opts?: { skipConfirm?: boolean }) => Promise<void>
  handleBulkUpdateOrders: () => Promise<void>
  handleBulkUpdateClients: () => Promise<void>
  handleRestoreSelectedClients: () => Promise<void>
  handleRunAutoOrders: () => Promise<void>
  handleGetAdminRoute: (order: Order) => void
  handleDeliveryDayChange: (day: string, checked: boolean) => void
  clearOrderFilters: () => void
}

export function useDashboardActions(input: UseDashboardActionsInput): UseDashboardActionsReturn {
  const {
    t,
    language,
    isLowAdminView,
    fetchData,
    fetchBinOrders,
    fetchBinClients,
    orders,
    setOrders,
    clients,
    binClients,
    binOrders,
    selectedDate,
    searchTerm,
    clientSearchTerm,
    activeTab,
    availableSets,
    profileUiText,
  } = input

  // ---------------------------------------------------------------------------
  // Selection state
  // ---------------------------------------------------------------------------
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedBinClients, setSelectedBinClients] = useState<Set<string>>(new Set())

  // ---------------------------------------------------------------------------
  // Dialog open/close state
  // ---------------------------------------------------------------------------
  const [isDeleteOrdersDialogOpen, setIsDeleteOrdersDialogOpen] = useState(false)
  const [isDeleteClientsDialogOpen, setIsDeleteClientsDialogOpen] = useState(false)
  const [isPauseClientsDialogOpen, setIsPauseClientsDialogOpen] = useState(false)
  const [isResumeClientsDialogOpen, setIsResumeClientsDialogOpen] = useState(false)
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false)
  const [isCreateCourierModalOpen, setIsCreateCourierModalOpen] = useState(false)
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)
  const [isBulkEditOrdersModalOpen, setIsBulkEditOrdersModalOpen] = useState(false)
  const [isBulkEditClientsModalOpen, setIsBulkEditClientsModalOpen] = useState(false)
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Loading flags
  // ---------------------------------------------------------------------------
  const [isDeletingOrders, setIsDeletingOrders] = useState(false)
  const [isMutatingClients, setIsMutatingClients] = useState(false)
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [isDashboardRefreshing, setIsDashboardRefreshing] = useState(false)
  const [isBinOrdersRefreshing, setIsBinOrdersRefreshing] = useState(false)
  const [isBinClientsRefreshing, setIsBinClientsRefreshing] = useState(false)
  const [isClientFinanceLoading, setIsClientFinanceLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Form data
  // ---------------------------------------------------------------------------
  const [orderFormData, setOrderFormData] = useState<OrderFormData>({ ...DEFAULT_ORDER_FORM })
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [orderError, setOrderError] = useState('')
  const [clientFormData, setClientFormData] = useState<ClientFormData>({ ...DEFAULT_CLIENT_FORM })
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [clientError, setClientError] = useState('')
  const [clientSelectedGroupId, setClientSelectedGroupId] = useState<string>('')
  const [bulkOrderUpdates, setBulkOrderUpdates] = useState<BulkOrderUpdates>({ ...DEFAULT_BULK_ORDER_UPDATES })
  const [bulkClientUpdates, setBulkClientUpdates] = useState<BulkClientUpdates>({ ...DEFAULT_BULK_CLIENT_UPDATES })
  const [filters, setFilters] = useState<OrderFilters>({ ...DEFAULT_ORDER_FILTERS })

  // ---------------------------------------------------------------------------
  // Selected order detail
  // ---------------------------------------------------------------------------
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderTimeline, setSelectedOrderTimeline] = useState<OrderTimelineEvent[]>([])
  const [isOrderTimelineLoading, setIsOrderTimelineLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Bin state
  // ---------------------------------------------------------------------------
  const [binOrdersSearch, setBinOrdersSearch] = useState('')
  const [binClientsSearch, setBinClientsSearch] = useState('')

  // ---------------------------------------------------------------------------
  // Client finance
  // ---------------------------------------------------------------------------
  const [clientFinanceById, setClientFinanceById] = useState<ClientFinanceById>({})

  // ---------------------------------------------------------------------------
  // Client sort/filter
  // ---------------------------------------------------------------------------
  const [clientSortStates, setClientSortStates] = useState<Record<string, SortState>>({})
  const [clientFilterOpen, setClientFilterOpen] = useState(false)
  const [clientFilterValues, setClientFilterValues] = useState<Record<string, string>>({})

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  const activeFiltersCount = Object.values(filters).reduce((count, value) => count + (value ? 1 : 0), 0)

  const clientAssignedSet = useMemo(() => {
    const id = clientFormData.assignedSetId
    if (!id) return null
    return (availableSets || []).find((s: any) => s?.id === id) ?? null
  }, [availableSets, clientFormData.assignedSetId])

  const clientGroupOptions = useMemo(() => getClientGroupOptions(clientAssignedSet), [clientAssignedSet])
  const clientSelectedGroup = useMemo(
    () => clientGroupOptions.find((g: any) => g.id === clientSelectedGroupId) ?? null,
    [clientGroupOptions, clientSelectedGroupId]
  )

  const selectedClientsSnapshot = useMemo(
    () => clients.filter((client) => selectedClients.has(client.id)),
    [clients, selectedClients]
  )
  const shouldPauseSelectedClients =
    selectedClientsSnapshot.length > 0 && selectedClientsSnapshot.every((client) => client.isActive)

  // Bin computed
  const visibleBinOrders = useMemo(() => {
    const q = binOrdersSearch.trim().toLowerCase()
    if (!q) return binOrders
    return binOrders.filter((o: any) => [o?.id, o?.status, o?.customer?.name, o?.customer?.phone].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [binOrders, binOrdersSearch])

  const visibleBinClients = useMemo(() => {
    const q = binClientsSearch.trim().toLowerCase()
    if (!q) return binClients
    return binClients.filter((c: any) => [c?.name, c?.phone, c?.address].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [binClients, binClientsSearch])

  // Client columns
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

  // Filtered clients
  const filteredClients = useMemo(() => {
    const q = clientSearchTerm.trim().toLowerCase()
    return clients.filter((c) => {
      if (!q) return true
      return [c.name, c.nickName, c.phone, c.address].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
    })
  }, [clientSearchTerm, clients])

  // Processed clients (with sort/filter applied)
  const processedClients = useMemo(() => {
    const flatRows = filteredClients.map((client) => {
      const finance = clientFinanceById[client.id]
      const days: string[] = []
      if (client.deliveryDays?.monday) days.push('Mon')
      if (client.deliveryDays?.tuesday) days.push('Tue')
      if (client.deliveryDays?.wednesday) days.push('Wed')
      if (client.deliveryDays?.thursday) days.push('Thu')
      if (client.deliveryDays?.friday) days.push('Fri')
      if (client.deliveryDays?.saturday) days.push('Sat')
      if (client.deliveryDays?.sunday) days.push('Sun')
      return {
        name: client.name, nickname: client.nickName || '', phone: client.phone,
        balance: String(Math.round(finance?.balance ?? 0)),
        days: String(Math.floor((finance?.balance ?? 0) / (finance?.dailyPrice || client.dailyPrice || 1))),
        address: client.address || '', calories: String(client.calories ?? 0),
        orders: String(orders.filter((o) => o.customerPhone === client.phone).length),
        deliveryDays: days.join(' '),
        status: client.isActive ? t.admin.table.active : t.admin.table.paused,
        notes: client.specialFeatures || '',
        created: new Date(client.createdAt).toLocaleDateString('en-GB'),
        _original: client,
      }
    })
    const filtered = applyFilters(flatRows as unknown as Record<string, unknown>[], clientFilterValues, clientColumns as FilterColumn[])
    const sorted = sortData(filtered as unknown as Record<string, unknown>[], clientSortStates, clientColumns)
    return sorted.map((row: Record<string, unknown>) => (row as { _original: typeof clients[0] })._original)
  }, [filteredClients, clientFinanceById, orders, clientFilterValues, clientSortStates, clientColumns, t.admin.table])

  // Normalized & filtered orders
  const isSelectedDateToday = useMemo(() => {
    if (!selectedDate) return false
    return toLocalIsoDate(selectedDate) === toLocalIsoDate(new Date())
  }, [selectedDate])

  const normalizedOrdersForSelectedDate = useMemo(() => {
    if (!selectedDate || isSelectedDateToday || !Array.isArray(orders) || orders.length === 0) return orders
    return orders.map((o) => {
      const status = String((o as any)?.orderStatus ?? '')
      if (status === 'PENDING' || status === 'IN_DELIVERY' || status === 'PAUSED') return { ...o, orderStatus: 'NEW' }
      return o
    })
  }, [isSelectedDateToday, orders, selectedDate])

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return normalizedOrdersForSelectedDate
    return normalizedOrdersForSelectedDate.filter((order) => {
      const name = (order.customer?.name || order.customerName || '').toLowerCase()
      const addr = (order.deliveryAddress || '').toLowerCase()
      const num = String(order.orderNumber ?? '')
      return name.includes(q) || addr.includes(q) || num.includes(q)
    })
  }, [normalizedOrdersForSelectedDate, searchTerm])

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'clients' || typeof window === 'undefined') return
    const controller = new AbortController()
    setIsClientFinanceLoading(true)
    void fetch('/api/admin/finance/clients?filter=all', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (controller.signal.aborted) return
        const data = res?.data
        if (!Array.isArray(data)) return
        const next: Record<string, { balance: number; dailyPrice: number }> = {}
        for (const row of data) {
          if (!row || typeof row !== 'object') continue
          const id = (row as any).id, balance = (row as any).balance, dailyPrice = (row as any).dailyPrice
          if (typeof id !== 'string' || typeof balance !== 'number' || !Number.isFinite(balance)) continue
          next[id] = { balance, dailyPrice: typeof dailyPrice === 'number' && Number.isFinite(dailyPrice) ? dailyPrice : 0 }
        }
        setClientFinanceById(next)
      })
      .catch(() => null)
      .finally(() => { if (!controller.signal.aborted) setIsClientFinanceLoading(false) })
    return () => { controller.abort() }
  }, [activeTab, clients.length])

  useEffect(() => { void fetch('/api/admin/dispatch/normalize-drafts', { method: 'POST' }).catch(() => null) }, [])
  useEffect(() => { setSelectedClients(new Set()) }, [clientSearchTerm])

  useEffect(() => {
    if (!isOrderDetailsModalOpen || !selectedOrder?.id) {
      setSelectedOrderTimeline([]); return
    }
    let cancelled = false
    setIsOrderTimelineLoading(true)
    void fetch(`/api/admin/orders/${selectedOrder.id}/timeline`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return
        const data = json?.data ?? json
        setSelectedOrderTimeline(Array.isArray(data?.events) ? data.events : [])
      })
      .catch(() => { if (!cancelled) setSelectedOrderTimeline([]) })
      .finally(() => { if (!cancelled) setIsOrderTimelineLoading(false) })
    return () => { cancelled = true }
  }, [isOrderDetailsModalOpen, selectedOrder?.id])

  useEffect(() => {
    if (!clientSelectedGroupId) return
    if (clientGroupOptions.some((g: any) => g.id === clientSelectedGroupId)) return
    setClientSelectedGroupId('')
  }, [clientGroupOptions, clientSelectedGroupId])

  // ---------------------------------------------------------------------------
  // Refresh handlers
  // ---------------------------------------------------------------------------
  const handleRefreshAll = useCallback(async () => {
    setIsDashboardRefreshing(true)
    try { await Promise.resolve(fetchData()) } finally { setIsDashboardRefreshing(false) }
  }, [fetchData])

  const handleRefreshBinOrders = useCallback(async () => {
    setIsBinOrdersRefreshing(true)
    try { await Promise.resolve(fetchBinOrders()) } finally { setIsBinOrdersRefreshing(false) }
  }, [fetchBinOrders])

  const handleRefreshBinClients = useCallback(async () => {
    setIsBinClientsRefreshing(true)
    try { await Promise.resolve(fetchBinClients()) } finally { setIsBinClientsRefreshing(false) }
  }, [fetchBinClients])

  // ---------------------------------------------------------------------------
  // Client sort/filter handlers
  // ---------------------------------------------------------------------------
  const handleClientSortChange = useCallback((key: string, state: SortState) => {
    setClientSortStates((prev) => ({ ...prev, [key]: state }))
  }, [])

  const handleClientFilterChange = useCallback((key: string, value: string) => {
    setClientFilterValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClientClearAllFilters = useCallback(() => {
    setClientFilterValues({})
  }, [])

  // ---------------------------------------------------------------------------
  // Action handlers (CRUD operations)
  // ---------------------------------------------------------------------------
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) newSet.delete(orderId)
      else newSet.add(orderId)
      return newSet
    })
  }

  const handleSelectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) setSelectedOrders(new Set())
    else setSelectedOrders(new Set(filteredOrders.map((order) => order.id)))
  }

  const handleDeleteSelectedOrders = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedOrders.size === 0) { toast.error(t.admin.toasts.selectOrdersToDelete); return }
    if (!skipConfirm) { setIsDeleteOrdersDialogOpen(true); return }
    try {
      setIsDeletingOrders(true)
      const response = await fetch('/api/admin/orders/delete', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.ordersDeleted.replace('{count}', String(data.deletedCount)))
        setSelectedOrders(new Set()); setIsDeleteOrdersDialogOpen(false); fetchData()
      } else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorDeletingOrders) }
    } catch (error) { console.error('Delete orders error:', error); toast.error(t.admin.toasts.serverConnectionError); toast.error(t.admin.toasts.serverConnectionError); setIsDeletingOrders(false) }
  }

  const handlePermanentDeleteOrders = async () => {
    if (isLowAdminView) { toast.error(t.admin.toasts.notAllowed); return }
    if (selectedOrders.size === 0) { toast.error(t.admin.toasts.selectOrdersToDelete); return }
    const confirmMessage = t.admin.toasts.confirmPermanentDeleteOrders.replace('{count}', String(selectedOrders.size))
    if (!confirm(confirmMessage)) return
    if (!confirm(t.admin.toasts.confirmPermanentDeleteOrdersAgain)) return
    try {
      const response = await fetch('/api/admin/orders/permanent-delete', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.ordersPermanentlyDeleted.replace('{count}', String(data.deletedCount)))
        setSelectedOrders(new Set()); fetchBinOrders()
      } else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorDeletingOrders) }
    } catch (error) { console.error('Permanent delete orders error:', error); toast.error(t.admin.toasts.serverConnectionError) }
  }

  const handleRestoreSelectedOrders = async () => {
    if (selectedOrders.size === 0) { toast.error(t.admin.toasts.selectOrdersToRestore); return }
    if (!confirm(t.admin.toasts.confirmRestoreOrders.replace('{count}', String(selectedOrders.size)))) return
    try {
      const response = await fetch('/api/admin/orders/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.ordersRestored.replace('{count}', String(data.updatedCount)))
        setSelectedOrders(new Set()); fetchBinOrders(); fetchData()
      } else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorRestoringOrders) }
    } catch (error) { console.error('Restore orders error:', error); toast.error(t.admin.toasts.serverConnectionError) }
  }

  const handleSelectAllBinOrders = () => {
    const visibleIds = visibleBinOrders.map((order: any) => order.id).filter(Boolean) as string[]
    if (visibleIds.length === 0) return
    const allVisibleSelected = visibleIds.every((id) => selectedOrders.has(id))
    setSelectedOrders((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  const handlePermanentDeleteClients = async () => {
    if (isLowAdminView) { toast.error(t.admin.toasts.notAllowed); return }
    if (selectedBinClients.size === 0) { toast.error(t.admin.toasts.selectClientsToDelete); return }
    const confirmMsg = t.admin.toasts.confirmPermanentDeleteClients.replace('{count}', String(selectedBinClients.size))
    if (!confirm(confirmMsg)) return
    if (!confirm(t.admin.toasts.confirmPermanentDeleteClientsAgain)) return
    try {
      const response = await fetch('/api/admin/clients/permanent-delete', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: Array.from(selectedBinClients) }),
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || t.admin.toasts.clientsPermanentlyDeleted.replace('{count}', String(data.deletedClients)))
        setSelectedBinClients(new Set()); fetchBinClients()
      } else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorDeletingClients) }
    } catch (error) { console.error('Permanent delete clients error:', error); toast.error(t.admin.toasts.serverConnectionError) }
  }

  const handleAddressChange = async (value: string) => {
    setOrderFormData((prev) => ({ ...prev, deliveryAddress: value }))
    const parsed = await parseGoogleMapsUrl(value)
    setOrderFormData((prev) => ({ ...prev, latitude: parsed?.lat ?? null, longitude: parsed?.lng ?? null }))
  }

  const handleClientAddressChange = async (value: string) => {
    setClientFormData((prev) => ({ ...prev, googleMapsLink: value }))
    if (!value) { setClientFormData((prev) => ({ ...prev, latitude: null, longitude: null })); return }
    const parsed = await parseGoogleMapsUrl(value)
    if (parsed) setClientFormData((prev) => ({ ...prev, latitude: parsed.lat, longitude: parsed.lng }))
    else setClientFormData((prev) => ({ ...prev, latitude: null, longitude: null }))
  }

  const handleClientSelect = (clientId: string) => {
    if (clientId && clientId !== 'manual') {
      const c = clients.find((cl) => cl.id === clientId)
      if (c) {
        setOrderFormData((prev) => ({
          ...prev, selectedClientId: clientId, customerName: c.name, customerPhone: c.phone,
          deliveryAddress: c.address, calories: c.calories, specialFeatures: c.specialFeatures, assignedSetId: c.assignedSetId || '',
        }))
      }
    } else {
      setOrderFormData((prev) => ({
        ...prev, selectedClientId: clientId === 'manual' ? 'manual' : '',
        customerName: '', customerPhone: '', deliveryAddress: '', calories: 1200, specialFeatures: '', assignedSetId: '',
      }))
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setIsCreatingOrder(true); setOrderError('')
    try {
      const parsedCoordinates = await parseGoogleMapsUrl(orderFormData.deliveryAddress)
      const effectiveOrderDate = toLocalIsoDate(selectedDate ?? new Date())
      const orderDataWithCoords = { ...orderFormData, latitude: parsedCoordinates?.lat ?? null, longitude: parsedCoordinates?.lng ?? null, date: effectiveOrderDate }
      let response: Response
      if (editingOrderId) {
        response = await fetch(`/api/orders/${editingOrderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_details', ...orderDataWithCoords }) })
      } else {
        response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderDataWithCoords) })
      }
      const data = await response.json()
      if (response.ok) { setIsCreateOrderModalOpen(false); setOrderFormData({ ...DEFAULT_ORDER_FORM }); setEditingOrderId(null); fetchData() }
      else setOrderError(data.error || t.admin.toasts.errorSavingOrder)
    } catch { setOrderError(t.admin.toasts.serverConnectionError) }
    finally { setIsCreatingOrder(false) }
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id)
    const inferredAssignedSetId = order.customer.assignedSetId || (clients.find((c) => c.phone === order.customer.phone)?.assignedSetId ?? '')
    setOrderFormData({
      customerName: order.customer.name, customerPhone: order.customer.phone, deliveryAddress: order.deliveryAddress,
      deliveryTime: order.deliveryTime, quantity: order.quantity, calories: order.calories,
      specialFeatures: order.specialFeatures || '', paymentStatus: order.paymentStatus as string,
      paymentMethod: order.paymentMethod as string, isPrepaid: order.isPrepaid,
      amountReceived: typeof order.amountReceived === 'number' ? order.amountReceived : null,
      selectedClientId: '', latitude: order.latitude || null, longitude: order.longitude || null,
      courierId: order.courierId || '', assignedSetId: inferredAssignedSetId,
    })
    setIsCreateOrderModalOpen(true)
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault(); setIsCreatingClient(true); setClientError('')
    try {
      const url = editingClientId ? `/api/admin/clients/${editingClientId}` : '/api/admin/clients'
      const method = editingClientId ? 'PATCH' : 'POST'
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientFormData) })
      const data = await response.json()
      if (response.ok) {
        setIsCreateClientModalOpen(false); setClientSelectedGroupId(''); setClientFormData({ ...DEFAULT_CLIENT_FORM }); setEditingClientId(null)
        const action = editingClientId ? t.admin.toasts.clientUpdated : t.admin.toasts.clientCreated
        const message = t.admin.toasts.clientActionSuccess.replace('{name}', data.client?.name || clientFormData.name).replace('{action}', action)
        let description = ''
        if (!editingClientId && data.autoOrdersCreated && data.autoOrdersCreated > 0) description = t.admin.toasts.autoOrdersCreatedInfo.replace('{count}', String(data.autoOrdersCreated))
        toast.success(message, { description }); fetchData()
      } else {
        const errorMessage = data.error || (editingClientId ? t.admin.toasts.errorUpdatingClient : t.admin.toasts.errorCreatingClient)
        setClientError(`${errorMessage}${data.details ? `\n${data.details}` : ''}`)
        toast.error(errorMessage, { description: data.details })
      }
    } catch { setClientError(t.admin.toasts.serverConnectionError) }
    finally { setIsCreatingClient(false) }
  }

  const handleEditClient = (client: Client) => {
    setClientSelectedGroupId('')
    setClientFormData({
      name: client.name, nickName: client.nickName || '', phone: client.phone, address: client.address,
      calories: client.calories, planType: client.planType || 'CLASSIC', dailyPrice: client.dailyPrice || 84000,
      notes: client.notes || '', specialFeatures: client.specialFeatures || '',
      deliveryDays: client.deliveryDays || { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
      autoOrdersEnabled: client.autoOrdersEnabled, isActive: client.isActive, defaultCourierId: client.defaultCourierId || '',
      googleMapsLink: client.googleMapsLink || '', latitude: client.latitude || null, longitude: client.longitude || null, assignedSetId: client.assignedSetId || '',
    })
    setEditingClientId(client.id); setIsCreateClientModalOpen(true)
  }

  const handleToggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/clients/toggle-status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds: [clientId], isActive: !currentStatus }) })
      if (response.ok) { toast.success(!currentStatus ? t.admin.toasts.clientActivated : t.admin.toasts.clientSuspended); fetchData() }
      else toast.error(t.admin.toasts.errorChangingClientStatus)
    } catch (error) { console.error('Error toggling client status:', error); toast.error(t.admin.toasts.serverConnectionError) }
  }

  const handleToggleClientSelection = (clientId: string) => {
    setSelectedClients((prev) => { const newSet = new Set(prev); if (newSet.has(clientId)) newSet.delete(clientId); else newSet.add(clientId); return newSet })
  }

  const handleDeleteSelectedClients = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedClients.size === 0) { toast.error(t.admin.toasts.selectClientsToDelete); return }
    if (!skipConfirm) { setIsDeleteClientsDialogOpen(true); return }
    try {
      setIsMutatingClients(true)
      const response = await fetch('/api/admin/clients/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds: Array.from(selectedClients), deleteOrders: true, daysBack: 30 }) })
      if (response.ok) {
        const data = await response.json()
        toast.success(t.admin.toasts.clientsAndOrdersDeleted.replace('{clients}', String(data.deletedClients)).replace('{orders}', String(data.deletedOrders)))
        setSelectedClients(new Set()); setIsDeleteClientsDialogOpen(false); fetchData()
      } else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorDeletingClients) }
    } catch (error) { console.error('Delete clients error:', error); toast.error(t.admin.toasts.serverConnectionError) }
    finally { setIsMutatingClients(false) }
  }

  const handlePauseSelectedClients = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedClients.size === 0) { toast.error(t.admin.toasts.selectClientsToPause); return }
    if (!skipConfirm) { setIsPauseClientsDialogOpen(true); return }
    try {
      setIsMutatingClients(true)
      const response = await fetch('/api/admin/clients/toggle-status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds: Array.from(selectedClients), isActive: false }) })
      if (response.ok) { const data = await response.json(); toast.success(t.admin.toasts.clientsPaused.replace('{count}', String(data.updatedCount))); setSelectedClients(new Set()); setIsPauseClientsDialogOpen(false); fetchData() }
      else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorPausingClients) }
    } catch (error) { console.error('Error pausing clients:', error); toast.error(t.admin.toasts.serverConnectionErrorRetry) }
    finally { setIsMutatingClients(false) }
  }

  const handleResumeSelectedClients = async ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (selectedClients.size === 0) { toast.error(t.admin.toasts.selectClientsToResume); return }
    if (!skipConfirm) { setIsResumeClientsDialogOpen(true); return }
    try {
      setIsMutatingClients(true)
      const response = await fetch('/api/admin/clients/toggle-status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds: Array.from(selectedClients), isActive: true }) })
      if (response.ok) { const data = await response.json(); toast.success(t.admin.toasts.clientsResumed.replace('{count}', String(data.updatedCount))); setSelectedClients(new Set()); setIsResumeClientsDialogOpen(false); fetchData() }
      else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorResumingClients) }
    } catch (error) { console.error('Error resuming clients:', error); toast.error(t.admin.toasts.serverConnectionErrorRetry) }
    finally { setIsMutatingClients(false) }
  }

  const handleBulkUpdateOrders = async () => {
    if (selectedOrders.size === 0) return; setIsUpdatingBulk(true)
    try {
      const updates: any = {}
      if (bulkOrderUpdates.orderStatus) updates.orderStatus = bulkOrderUpdates.orderStatus
      if (bulkOrderUpdates.paymentStatus) updates.paymentStatus = bulkOrderUpdates.paymentStatus
      if (bulkOrderUpdates.courierId) updates.courierId = bulkOrderUpdates.courierId
      if (bulkOrderUpdates.deliveryDate) updates.deliveryDate = bulkOrderUpdates.deliveryDate
      const response = await fetch('/api/admin/orders/bulk-update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: Array.from(selectedOrders), updates }) })
      if (response.ok) { const data = await response.json(); toast.success(t.admin.toasts.ordersUpdated.replace('{count}', String(data.updatedCount))); setIsBulkEditOrdersModalOpen(false); setSelectedOrders(new Set()); setBulkOrderUpdates({ orderStatus: '', paymentStatus: '', courierId: '', deliveryDate: '' }); fetchData() }
      else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorUpdatingOrders, { description: data.details || undefined }) }
    } catch (error) { console.error('Error bulk updating orders:', error); toast.error(t.admin.toasts.serverConnectionError) }
    finally { setIsUpdatingBulk(false) }
  }

  const handleBulkUpdateClients = async () => {
    if (selectedClients.size === 0) return; setIsUpdatingBulk(true)
    try {
      const updates: any = {}
      if (bulkClientUpdates.isActive !== undefined) updates.isActive = bulkClientUpdates.isActive
      if (bulkClientUpdates.calories) updates.calories = bulkClientUpdates.calories
      const response = await fetch('/api/admin/clients/bulk-update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds: Array.from(selectedClients), updates }) })
      if (response.ok) { const data = await response.json(); toast.success(t.admin.toasts.clientsUpdated.replace('{count}', String(data.updatedCount))); setIsBulkEditClientsModalOpen(false); setSelectedClients(new Set()); setBulkClientUpdates({ isActive: undefined, calories: '' }); fetchData() }
      else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorUpdatingClients) }
    } catch (error) { console.error('Error bulk updating clients:', error); toast.error(t.admin.toasts.serverConnectionError) }
    finally { setIsUpdatingBulk(false) }
  }

  const handleRestoreSelectedClients = async () => {
    if (selectedBinClients.size === 0) { toast.error(t.admin.toasts.selectClientsToRestore); return }
    const list = Array.from(selectedBinClients).map((id) => binClients.find((c: any) => c.id === id)?.name || t.admin.toasts.unknownClient).join(', ')
    const hasActive = binClients.some((c: any) => selectedBinClients.has(c.id) && c.isActive)
    if (!confirm(`${t.admin.toasts.confirmRestoreClients}\n\n${list}\n\n${hasActive ? t.admin.toasts.autoOrdersForActiveClients : ''}`)) return
    try {
      const response = await fetch('/api/admin/clients/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientIds: Array.from(selectedBinClients) }) })
      if (response.ok) { const data = await response.json(); toast.success(data.message || t.admin.toasts.clientsRestored.replace('{count}', String(data.restoredClients))); setSelectedBinClients(new Set()); fetchData() }
      else { const data = await response.json(); toast.error(data.error || t.admin.toasts.errorRestoringClients) }
    } catch (error) { console.error('Restore clients error:', error); toast.error(t.admin.toasts.serverConnectionError) }
  }

  const handleRunAutoOrders = async () => {
    try {
      toast.info(t.admin.toasts.startingAutoOrders)
      const response = await fetch('/api/admin/auto-orders/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetDate: new Date() }) })
      if (response.ok) { const json = await response.json(); const data = json?.data ?? json; toast.success(data.message || t.admin.toasts.autoOrdersCreatedCount.replace('{count}', String(data.ordersCreated ?? data.createdCount))); fetchData() }
      else { const json = await response.json(); const data = json?.data ?? json; toast.error(data?.error || json?.error || t.admin.toasts.errorCreatingOrders) }
    } catch (error) { console.error('Run auto orders error:', error); toast.error(t.admin.toasts.serverConnectionError) }
  }

  const handleGetAdminRoute = (order: Order) => {
    try {
      let destination = order.deliveryAddress
      if (order.latitude && order.longitude) destination = `${order.latitude},${order.longitude}`
      window.open(`https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${destination}&travelmode=driving&dir_action=navigate`, '_blank')
    } catch (error) { console.error('Error getting route:', error) }
  }

  const handleDeliveryDayChange = (day: string, checked: boolean) => {
    setClientFormData((prev) => ({ ...prev, deliveryDays: { ...prev.deliveryDays, [day]: checked } }))
  }

  const clearOrderFilters = () => { setFilters({ ...DEFAULT_ORDER_FILTERS }) }

  return {
    // Selection state
    selectedOrders, setSelectedOrders,
    selectedClients, setSelectedClients,
    selectedBinClients, setSelectedBinClients,
    // Dialog open/close
    isDeleteOrdersDialogOpen, setIsDeleteOrdersDialogOpen,
    isDeleteClientsDialogOpen, setIsDeleteClientsDialogOpen,
    isPauseClientsDialogOpen, setIsPauseClientsDialogOpen,
    isResumeClientsDialogOpen, setIsResumeClientsDialogOpen,
    isCreateOrderModalOpen, setIsCreateOrderModalOpen,
    isCreateCourierModalOpen, setIsCreateCourierModalOpen,
    isCreateClientModalOpen, setIsCreateClientModalOpen,
    isBulkEditOrdersModalOpen, setIsBulkEditOrdersModalOpen,
    isBulkEditClientsModalOpen, setIsBulkEditClientsModalOpen,
    isOrderDetailsModalOpen, setIsOrderDetailsModalOpen,
    // Loading flags
    isDeletingOrders, isMutatingClients, isUpdatingBulk, isCreatingOrder, isCreatingClient,
    isDashboardRefreshing, isBinOrdersRefreshing, isBinClientsRefreshing, isClientFinanceLoading,
    // Form data
    orderFormData, setOrderFormData, editingOrderId, setEditingOrderId, orderError,
    clientFormData, setClientFormData, editingClientId, setEditingClientId, clientError, setClientError,
    clientSelectedGroupId, setClientSelectedGroupId,
    bulkOrderUpdates, setBulkOrderUpdates, bulkClientUpdates, setBulkClientUpdates,
    filters, setFilters,
    // Selected order detail
    selectedOrder, setSelectedOrder, selectedOrderTimeline, setSelectedOrderTimeline, isOrderTimelineLoading,
    // Bin state
    binOrdersSearch, setBinOrdersSearch, binClientsSearch, setBinClientsSearch,
    visibleBinOrders, visibleBinClients,
    // Client finance
    clientFinanceById,
    // Client sort/filter
    clientSortStates, clientFilterOpen, setClientFilterOpen, clientFilterValues,
    handleClientSortChange, handleClientFilterChange, handleClientClearAllFilters,
    clientColumns, processedClients,
    // Computed
    selectedClientsSnapshot, shouldPauseSelectedClients, activeFiltersCount,
    clientAssignedSet, clientGroupOptions, clientSelectedGroup,
    filteredOrders, filteredClients, normalizedOrdersForSelectedDate,
    // Refresh handlers
    handleRefreshAll, handleRefreshBinOrders, handleRefreshBinClients,
    // Action handlers
    handleOrderSelect, handleSelectAllOrders, handleDeleteSelectedOrders,
    handlePermanentDeleteOrders, handleRestoreSelectedOrders, handleSelectAllBinOrders,
    handlePermanentDeleteClients, handleAddressChange, handleClientAddressChange,
    handleClientSelect, handleCreateOrder, handleEditOrder, handleCreateClient,
    handleEditClient, handleToggleClientStatus, handleToggleClientSelection,
    handleDeleteSelectedClients, handlePauseSelectedClients, handleResumeSelectedClients,
    handleBulkUpdateOrders, handleBulkUpdateClients, handleRestoreSelectedClients,
    handleRunAutoOrders, handleGetAdminRoute, handleDeliveryDayChange, clearOrderFilters,
  }
}
