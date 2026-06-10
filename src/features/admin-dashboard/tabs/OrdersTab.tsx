'use client'

import type { RefObject } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Trash2,
  CalendarDays,
  Save,
  Play,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { Order } from '@/features/admin-dashboard/model'
import type { ProfileUiText } from '@/features/admin-dashboard/shell/types'
import { CalendarDateSelector } from '@/components/admin/dashboard/shared/CalendarDateSelector'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'

const OrdersTable = dynamic(
  () => import('@/components/admin/OrdersTable').then((mod) => mod.OrdersTable),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div> }
)

export interface OrdersTabProps {
  // Data
  filteredOrders: Order[]
  selectedOrders: Set<string>
  isDeletingOrders: boolean
  isLoading: boolean
  isDashboardRefreshing: boolean

  // Date selection
  selectedDate: Date | null
  applySelectedDate: (date: Date | null) => void
  shiftSelectedDate: (days: number) => void
  selectedPeriodLabel: string
  selectedPeriod: DateRange | undefined
  applySelectedPeriod: (period: DateRange | undefined) => void
  dateLocale: string

  // Dispatch
  selectedDayIsActive: boolean | null
  isDispatchOpen: boolean
  setIsDispatchOpen: (open: boolean) => void

  // Search
  searchInputRef: RefObject<HTMLInputElement | null>
  searchTerm: string
  setSearchTerm: (term: string) => void

  // Filters
  showFilters: boolean
  filters: Record<string, boolean>
  setFilters: (filters: Record<string, boolean>) => void
  clearOrderFilters: () => void
  activeFiltersCount: number

  // Translations
  t: {
    admin: {
      manageOrders: string
      manageOrdersDesc: string
      createOrder: string
      deleteSelected: string
      filters: string
      filterGroups: {
        deliveryStatus: string
        pending: string
        inDelivery: string
        delivered: string
        failed: string
        payment: string
        paid: string
        unpaid: string
        prepaid: string
        cash: string
        card: string
        calories: string
        auto: string
        manual: string
        singlePortion: string
        multiPortion: string
        other: string
      }
    }
    common: {
      loading: string
    }
  }
  profileUiText: ProfileUiText

  // Callbacks
  onRefreshAll: () => void
  onOpenCreateOrderModal: () => void
  onOpenDeleteOrdersDialog: () => void
  onSelectOrder: (orderId: string) => void
  onSelectAllOrders: () => void
  onViewOrder: (order: Order) => void
  onEditOrder: (order: Order) => void
}

export function OrdersTab({
  filteredOrders,
  selectedOrders,
  isDeletingOrders,
  isLoading,
  isDashboardRefreshing,
  selectedDate,
  applySelectedDate,
  shiftSelectedDate,
  selectedPeriodLabel,
  selectedPeriod,
  applySelectedPeriod,
  dateLocale,
  selectedDayIsActive,
  isDispatchOpen,
  setIsDispatchOpen,
  searchInputRef,
  searchTerm,
  setSearchTerm,
  showFilters,
  filters,
  setFilters,
  clearOrderFilters,
  activeFiltersCount,
  t,
  profileUiText,
  onRefreshAll,
  onOpenCreateOrderModal,
  onOpenDeleteOrdersDialog,
  onSelectOrder,
  onSelectAllOrders,
  onViewOrder,
  onEditOrder,
}: OrdersTabProps) {
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

  return (
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
              onClick={() => void onRefreshAll()}
              isLoading={isLoading || isDashboardRefreshing}
              iconSize="md"
            />
            <Button
              onClick={onOpenCreateOrderModal}
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
              onClick={onOpenDeleteOrdersDialog}
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
            onSelectOrder={onSelectOrder}
            onSelectAll={onSelectAllOrders}
            onDeleteSelected={onOpenDeleteOrdersDialog}
            onViewOrder={onViewOrder}
            onEditOrder={onEditOrder}
          />
        </div>
      </CardContent>
    </Card>
  )
}
