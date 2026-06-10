'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Skeleton } from '@/components/ui/skeleton'
import { TabsContent } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminDashboardShell } from '@/features/admin-dashboard/shell'
import type { ProfileUiText as ProfileUiTextType } from '@/features/admin-dashboard/shell'
import { getProfileUiText, type ProfileUiText } from '@/features/admin-dashboard/config/profile-ui-text'
import { useWarehousePoint } from '@/features/admin-dashboard/hooks/useWarehousePoint'
import { useDashboardActions } from '@/features/admin-dashboard/hooks/useDashboardActions'
import { useDashboardUiState } from '@/features/admin-dashboard/hooks/useDashboardUiState'
import { SettingsContent } from '@/features/admin-dashboard/shell/SettingsContent'
import type { AdminDashboardMode } from '@/features/admin-dashboard/model'
import { DEFAULT_CLIENT_FORM, toLocalIsoDate, useAdminDashboardTab, getDateLocale } from '@/features/admin-dashboard/model'
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData'
import type { DateRange } from 'react-day-picker'

// ---------------------------------------------------------------------------
// Dynamic imports — code-split heavy components
// ---------------------------------------------------------------------------
const AdminsTab = dynamic(() => import('@/components/admin/dashboard/tabs-content/AdminsTab').then(m => ({ default: m.AdminsTab })), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> })
const OrderModal = dynamic(() => import('@/components/admin/dashboard/modals/OrderModal').then(m => ({ default: m.OrderModal })), { ssr: false })
const DispatchMapPanel = dynamic(() => import('@/components/admin/orders/DispatchMapPanel').then((mod) => mod.DispatchMapPanel), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full rounded-xl" /> })
const HistoryTable = dynamic(() => import('@/components/admin/HistoryTable').then((mod) => mod.HistoryTable), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div> })
const WarehouseTab = dynamic(() => import('@/components/admin/WarehouseTab').then((mod) => mod.WarehouseTab), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> })
const FinanceTab = dynamic(() => import('@/components/admin/FinanceTab').then((mod) => mod.FinanceTab), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> })
const StatisticsTab = dynamic(() => import('@/features/admin-dashboard/tabs/StatisticsTab').then(m => ({ default: m.StatisticsTab })), { ssr: false })
const OrdersTab = dynamic(() => import('@/features/admin-dashboard/tabs/OrdersTab').then(m => ({ default: m.OrdersTab })), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> })
const ClientsTab = dynamic(() => import('@/features/admin-dashboard/tabs/ClientsTab').then(m => ({ default: m.ClientsTab })), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> })
const BinTab = dynamic(() => import('@/features/admin-dashboard/tabs/BinTab').then(m => ({ default: m.BinTab })), { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div> })
const OrderDetailsModal = dynamic(() => import('@/features/admin-dashboard/modals/OrderDetailsModal').then(m => ({ default: m.OrderDetailsModal })), { ssr: false })
const CourierCreateModal = dynamic(() => import('@/features/admin-dashboard/modals/CourierCreateModal').then(m => ({ default: m.CourierCreateModal })), { ssr: false })
const DeleteOrdersAlertDialog = dynamic(() => import('@/features/admin-dashboard/modals/DeleteOrdersAlertDialog').then(m => ({ default: m.DeleteOrdersAlertDialog })), { ssr: false })

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AdminDashboardPage({ mode }: { mode: AdminDashboardMode }) {
  const { t, language } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [currentDate, setCurrentDate] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => (mode === 'middle' ? new Date() : null))
  const [selectedPeriod, setSelectedPeriod] = useState<DateRange | undefined>(() => {
    if (mode !== 'middle') return undefined
    const today = new Date(); today.setHours(0, 0, 0, 0); return { from: today, to: today }
  })
  const [, setDateCursor] = useState<Date>(() => new Date())
  const [isDispatchOpen, setIsDispatchOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [optimizeCourierId, setOptimizeCourierId] = useState('all')
  const handledDashboardQueryRef = useRef<string>('')

  useEffect(() => { setCurrentDate(new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) }, [])

  const { meRole, allowedTabs, isLoading, lowAdmins, orders, setOrders, clients, couriers, availableSets, stats, binClients, binOrders, refreshAll, refreshBinClients, refreshBinOrders } = useDashboardData({ selectedPeriod, filters: {} })
  const { activeTab, setActiveTab, visibleTabs } = useAdminDashboardTab({ mode, meRole: meRole ?? undefined, allowedTabs: allowedTabs ?? undefined })
  const fetchData = () => refreshAll()
  const fetchBinOrders = () => refreshBinOrders()
  const fetchBinClients = () => refreshBinClients()
  const isMiddleAdminView = mode === 'middle' || meRole === 'MIDDLE_ADMIN'
  const isLowAdminView = mode === 'low' || meRole === 'LOW_ADMIN'
  const dateLocale = getDateLocale(language)
  const profileUiText = useMemo(() => getProfileUiText(language), [language])

  // Date/period helpers
  const applySelectedDate = useCallback((nextDate: Date | null) => {
    if (!nextDate) { setSelectedDate(null); setSelectedPeriod(undefined); return }
    const d = new Date(nextDate); d.setHours(0, 0, 0, 0)
    if (!Number.isNaN(d.getTime())) { setSelectedDate(d); setSelectedPeriod({ from: d, to: d }); setDateCursor(d) }
  }, [])
  const applySelectedPeriod = useCallback((nextPeriod: DateRange | undefined) => {
    if (!nextPeriod?.from) { setSelectedPeriod(undefined); setSelectedDate(null); setDateCursor(new Date()); return }
    const from = new Date(nextPeriod.from); from.setHours(0, 0, 0, 0)
    const to = nextPeriod.to ? new Date(nextPeriod.to) : new Date(from); to.setHours(0, 0, 0, 0)
    setSelectedPeriod({ from, to })
    if (toLocalIsoDate(from) === toLocalIsoDate(to)) { setSelectedDate(from); setDateCursor(from) }
    else { setSelectedDate(null); setDateCursor(from) }
  }, [])
  const shiftSelectedDate = useCallback((days: number) => { const b = selectedDate ? new Date(selectedDate) : new Date(); b.setDate(b.getDate() + days); applySelectedDate(b) }, [applySelectedDate, selectedDate])

  // Warehouse point
  const warehouseValues = useWarehousePoint({ isReadOnly: isLowAdminView, profileUiText, errorSavingWarehouse: t.admin.toasts.errorSavingWarehouse, warehouseSaved: t.admin.toasts.warehouseSaved, enterMapsLinkOrCoords: t.admin.toasts.enterMapsLinkOrCoords })

  // Dashboard actions hook — all handlers + associated state
  const a = useDashboardActions({
    t, language, isLowAdminView, isMiddleAdminView, fetchData, fetchBinOrders, fetchBinClients,
    orders, setOrders, clients, binClients, binOrders, selectedDate, searchTerm, clientSearchTerm, activeTab, availableSets, profileUiText,
  })

  // UI state persistence + keyboard shortcuts
  useDashboardUiState({ mode, selectedPeriod, selectedDate, activeTab, visibleTabs, applySelectedPeriod, searchInputRef, showFilters, setShowFilters, searchTerm, setSearchTerm, clientSearchTerm, setClientSearchTerm, optimizeCourierId, setOptimizeCourierId, setSelectedDate, setSelectedPeriod, setDateCursor, setActiveTab })

  // Date-derived computed values
  const isSelectedDateToday = useMemo(() => { if (!selectedDate) return false; return toLocalIsoDate(selectedDate) === toLocalIsoDate(new Date()) }, [selectedDate])
  const selectedDayIsActive = useMemo(() => { if (!selectedDate || !Array.isArray(orders) || orders.length === 0 || !isSelectedDateToday) return !!selectedDate ? false : null; return orders.some((o) => { const s = String((o as any)?.orderStatus ?? ''); return !!(o as any)?.courierId && s !== 'NEW' && s !== 'IN_PROCESS' }) }, [isSelectedDateToday, orders, selectedDate])
  const selectedDateISO = selectedDate ? toLocalIsoDate(selectedDate) : ''
  const selectedDateLabel = selectedDate ? selectedDate.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : profileUiText.noDateSelected
  const selectedPeriodLabel = useMemo(() => {
    if (!selectedPeriod?.from) return profileUiText.allTime ?? profileUiText.noDateSelected
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    const fl = selectedPeriod.from.toLocaleDateString(dateLocale, opts)
    const tl = (selectedPeriod.to ?? selectedPeriod.from).toLocaleDateString(dateLocale, opts)
    return fl === tl ? fl : `${fl} - ${tl}`
  }, [dateLocale, profileUiText.allTime, profileUiText.noDateSelected, selectedPeriod])
  const dispatchOrders = useMemo(() => { if (!selectedDateISO || !Array.isArray(orders) || orders.length === 0) return []; return orders.filter((o: any) => String(o?.deliveryDate ?? '') === selectedDateISO) }, [orders, selectedDateISO])

  // Search params
  const searchParams = useSearchParams()
  useEffect(() => { if (!searchParams) return; const key = searchParams.toString(); if (!key || handledDashboardQueryRef.current === key) return; handledDashboardQueryRef.current = key; if (searchParams.get('settings') === '1') setIsSettingsOpen(true); if (searchParams.get('chat') === '1') setIsChatOpen(true) }, [searchParams])
  useEffect(() => { if (selectedPeriod?.from) setDateCursor(selectedPeriod.from) }, [selectedPeriod])

  const tabsCopy = { orders: t.admin.orders, clients: t.admin.clients, admins: t.admin.admins, bin: t.admin.bin, statistics: t.admin.statistics, history: t.admin.history, warehouse: t.warehouse.title, finance: t.finance.title, interface: t.admin.interface }

  const handleLogout = async () => { if (typeof window !== 'undefined') { localStorage.removeItem('token'); localStorage.removeItem('user') }; await signOut({ callbackUrl: '/', redirect: true }) }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (<div className="flex min-h-screen items-center justify-center bg-background"><div className="text-center animate-fade-in"><div className="flex items-center justify-center gap-2 mb-4"><Skeleton className="h-3 w-3 rounded-full" /><Skeleton className="h-3 w-3 rounded-full" /><Skeleton className="h-3 w-3 rounded-full" /></div><p className="text-xs text-muted-foreground tracking-wide">Loading...</p></div></div>)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AdminDashboardShell
      activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={visibleTabs} tabsCopy={tabsCopy}
      profileUiText={profileUiText as ProfileUiTextType} isMiddleAdminView={isMiddleAdminView} isLowAdminView={isLowAdminView}
      currentDate={currentDate} isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen}
      isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen}
      isChangePasswordOpen={isChangePasswordOpen} setIsChangePasswordOpen={setIsChangePasswordOpen}
      handleLogout={handleLogout} mode={mode}
      settingsDialogContent={<SettingsContent profileUiText={profileUiText} isLowAdminView={isLowAdminView} isWarehouseReadOnly={isLowAdminView} onChangePassword={() => setIsChangePasswordOpen(true)} warehouse={warehouseValues} />}
    >
      {/* Statistics Tab */}
      {!isMiddleAdminView && <TabsContent value="statistics" className="space-y-5 animate-fade-in"><StatisticsTab stats={stats} t={t} /></TabsContent>}

      {/* Orders Tab */}
      <TabsContent value="orders" className="space-y-4">
        <OrdersTab
          filteredOrders={a.filteredOrders} selectedOrders={a.selectedOrders} isDeletingOrders={a.isDeletingOrders}
          isLoading={isLoading} isDashboardRefreshing={a.isDashboardRefreshing}
          selectedDate={selectedDate} applySelectedDate={applySelectedDate} shiftSelectedDate={shiftSelectedDate}
          selectedPeriodLabel={selectedPeriodLabel} selectedPeriod={selectedPeriod} applySelectedPeriod={applySelectedPeriod}
          dateLocale={dateLocale} selectedDayIsActive={selectedDayIsActive}
          isDispatchOpen={isDispatchOpen} setIsDispatchOpen={setIsDispatchOpen}
          searchInputRef={searchInputRef} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          showFilters={showFilters} filters={a.filters} setFilters={(f) => a.setFilters(f as typeof a.filters)}
          clearOrderFilters={a.clearOrderFilters} activeFiltersCount={a.activeFiltersCount}
          t={t} profileUiText={profileUiText}
          onRefreshAll={() => void a.handleRefreshAll()} onOpenCreateOrderModal={() => a.setIsCreateOrderModalOpen(true)}
          onOpenDeleteOrdersDialog={() => a.setIsDeleteOrdersDialogOpen(true)}
          onSelectOrder={a.handleOrderSelect} onSelectAllOrders={a.handleSelectAllOrders}
          onViewOrder={(order) => { a.setSelectedOrder(order); a.setIsOrderDetailsModalOpen(true) }}
          onEditOrder={a.handleEditOrder}
        />
      </TabsContent>

      {/* Clients Tab */}
      <TabsContent value="clients" className="space-y-6">
        <ClientsTab
          clients={clients} orders={orders} couriers={couriers} availableSets={availableSets}
          processedClients={a.processedClients} filteredClients={a.filteredClients}
          selectedClients={a.selectedClients} isMutatingClients={a.isMutatingClients}
          isClientFinanceLoading={a.isClientFinanceLoading} clientFinanceById={a.clientFinanceById}
          shouldPauseSelectedClients={a.shouldPauseSelectedClients} isLoading={isLoading}
          isDashboardRefreshing={a.isDashboardRefreshing}
          selectedDate={selectedDate} applySelectedDate={applySelectedDate} shiftSelectedDate={shiftSelectedDate}
          selectedPeriodLabel={selectedPeriodLabel} selectedPeriod={selectedPeriod} applySelectedPeriod={applySelectedPeriod}
          dateLocale={dateLocale} clientSearchTerm={clientSearchTerm} setClientSearchTerm={setClientSearchTerm}
          isCreateClientModalOpen={a.isCreateClientModalOpen} setIsCreateClientModalOpen={a.setIsCreateClientModalOpen}
          clientFormData={a.clientFormData} setClientFormData={a.setClientFormData}
          clientSelectedGroupId={a.clientSelectedGroupId} setClientSelectedGroupId={a.setClientSelectedGroupId}
          clientGroupOptions={a.clientGroupOptions} clientSelectedGroup={a.clientSelectedGroup}
          clientAssignedSet={a.clientAssignedSet} editingClientId={a.editingClientId}
          isCreatingClient={a.isCreatingClient} clientError={a.clientError}
          isDeleteClientsDialogOpen={a.isDeleteClientsDialogOpen} setIsDeleteClientsDialogOpen={a.setIsDeleteClientsDialogOpen}
          isPauseClientsDialogOpen={a.isPauseClientsDialogOpen} setIsPauseClientsDialogOpen={a.setIsPauseClientsDialogOpen}
          isResumeClientsDialogOpen={a.isResumeClientsDialogOpen} setIsResumeClientsDialogOpen={a.setIsResumeClientsDialogOpen}
          clientSortStates={a.clientSortStates} handleClientSortChange={a.handleClientSortChange}
          clientFilterOpen={a.clientFilterOpen} setClientFilterOpen={a.setClientFilterOpen}
          clientFilterValues={a.clientFilterValues} handleClientFilterChange={a.handleClientFilterChange}
          handleClientClearAllFilters={a.handleClientClearAllFilters} clientColumns={a.clientColumns}
          t={t} language={language} profileUiText={profileUiText}
          onRefreshAll={() => void a.handleRefreshAll()} onCreateClient={a.handleCreateClient}
          onOpenCreateClientModal={() => { a.setEditingClientId(null); a.setClientSelectedGroupId(''); a.setClientFormData({ ...DEFAULT_CLIENT_FORM }); a.setClientError(''); a.setIsCreateClientModalOpen(true) }}
          onEditClient={a.handleEditClient} onClientAddressChange={(value) => void a.handleClientAddressChange(value)}
          onDeliveryDayChange={a.handleDeliveryDayChange} onToggleClientSelection={a.handleToggleClientSelection}
          onToggleClientStatus={a.handleToggleClientStatus} onDeleteSelectedClients={a.handleDeleteSelectedClients}
          onPauseSelectedClients={a.handlePauseSelectedClients} onResumeSelectedClients={a.handleResumeSelectedClients}
          onSetSelectedClients={a.setSelectedClients}
        />
      </TabsContent>

      {/* Dispatch Map */}
      {isDispatchOpen && <DispatchMapPanel open={isDispatchOpen} onOpenChange={setIsDispatchOpen} orders={dispatchOrders} couriers={couriers} selectedDateLabel={selectedDate ? selectedDateLabel : profileUiText.allOrders} selectedDateISO={selectedDateISO || undefined} warehousePoint={warehouseValues.warehousePoint} onSaved={fetchData} />}

      {/* Admins Tab */}
      <AdminsTab lowAdmins={lowAdmins} isLowAdminView={isLowAdminView} onRefresh={fetchData} tabsCopy={tabsCopy} orders={orders} selectedDate={selectedDate} applySelectedDate={applySelectedDate} shiftSelectedDate={shiftSelectedDate} selectedDateLabel={selectedPeriodLabel} selectedPeriod={selectedPeriod} applySelectedPeriod={applySelectedPeriod} selectedPeriodLabel={selectedPeriodLabel} profileUiText={profileUiText} />

      {/* History Tab */}
      <TabsContent value="history" className="space-y-5 animate-fade-in"><div className="dense-card"><HistoryTable role={meRole || 'MIDDLE_ADMIN'} limit={50} selectedDate={selectedDate} applySelectedDate={applySelectedDate} shiftSelectedDate={shiftSelectedDate} selectedDateLabel={selectedPeriodLabel} selectedPeriod={selectedPeriod} applySelectedPeriod={applySelectedPeriod} selectedPeriodLabel={selectedPeriodLabel} profileUiText={profileUiText} /></div></TabsContent>

      {/* Bin Tab */}
      <TabsContent value="bin" className="space-y-4">
        <BinTab
          visibleBinOrders={a.visibleBinOrders} binOrdersSearch={a.binOrdersSearch} setBinOrdersSearch={a.setBinOrdersSearch}
          isBinOrdersRefreshing={a.isBinOrdersRefreshing} visibleBinClients={a.visibleBinClients}
          binClientsSearch={a.binClientsSearch} setBinClientsSearch={a.setBinClientsSearch}
          isBinClientsRefreshing={a.isBinClientsRefreshing} selectedOrders={a.selectedOrders}
          selectedBinClients={a.selectedBinClients} setSelectedBinClients={a.setSelectedBinClients}
          onPermanentDeleteOrders={a.handlePermanentDeleteOrders} onRestoreSelectedOrders={a.handleRestoreSelectedOrders}
          onRefreshBinOrders={() => void a.handleRefreshBinOrders()} onSelectOrder={a.handleOrderSelect}
          onSelectAllBinOrders={a.handleSelectAllBinOrders}
          onViewOrder={(order) => { a.setSelectedOrder(order); a.setIsOrderDetailsModalOpen(true) }}
          onPermanentDeleteClients={a.handlePermanentDeleteClients} onRestoreSelectedClients={a.handleRestoreSelectedClients}
          onRefreshBinClients={() => void a.handleRefreshBinClients()} t={t} language={language} profileUiText={profileUiText}
        />
      </TabsContent>

      <TabsContent value="warehouse" className="space-y-4"><WarehouseTab /></TabsContent>
      <TabsContent value="finance" className="space-y-4"><FinanceTab selectedDate={selectedDate} applySelectedDate={applySelectedDate} shiftSelectedDate={shiftSelectedDate} selectedDateLabel={selectedPeriodLabel} selectedPeriod={selectedPeriod} applySelectedPeriod={applySelectedPeriod} selectedPeriodLabel={selectedPeriodLabel} profileUiText={profileUiText} /></TabsContent>

      <DeleteOrdersAlertDialog open={a.isDeleteOrdersDialogOpen} onOpenChange={a.setIsDeleteOrdersDialogOpen} isDeleting={a.isDeletingOrders} selectedCount={a.selectedOrders.size} onConfirm={() => void a.handleDeleteSelectedOrders({ skipConfirm: true })} t={t} />
      <OrderDetailsModal open={a.isOrderDetailsModalOpen} onOpenChange={a.setIsOrderDetailsModalOpen} order={a.selectedOrder} timeline={a.selectedOrderTimeline} isTimelineLoading={a.isOrderTimelineLoading} t={t} onEdit={a.handleEditOrder} />
      <OrderModal open={a.isCreateOrderModalOpen} onOpenChange={a.setIsCreateOrderModalOpen} editingOrderId={a.editingOrderId} setEditingOrderId={a.setEditingOrderId} orderFormData={a.orderFormData} setOrderFormData={a.setOrderFormData} editingOrder={a.editingOrderId ? (orders.find(o => o.id === a.editingOrderId) || null) : null} clients={clients} couriers={couriers} availableSets={availableSets} orderError={a.orderError} isCreatingOrder={a.isCreatingOrder} onSubmit={a.handleCreateOrder} onClientSelect={a.handleClientSelect} onAddressChange={a.handleAddressChange} />
      <CourierCreateModal open={a.isCreateCourierModalOpen} onOpenChange={a.setIsCreateCourierModalOpen} onCreated={fetchData} t={t} />
    </AdminDashboardShell>
  )
}

export default AdminDashboardPage
