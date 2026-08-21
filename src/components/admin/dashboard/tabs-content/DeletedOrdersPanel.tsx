import dynamic from 'next/dynamic'

import { History, Trash2 } from 'lucide-react'
import type { Order } from '@/components/admin/dashboard/types'
import { IconButton } from '@/components/ui/icon-button'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'

const OrdersTable = dynamic(
  () => import('@/components/admin/OrdersTable').then((mod) => mod.OrdersTable),
  { ssr: false, loading: () => <div className="p-4 text-sm text-muted-foreground">Loading...</div> },
)

export type DeletedOrdersPanelProps = {
  title: string
  deleteLabel: string
  restoreLabel: string
  refreshLabel: string
  searchPlaceholder: string
  orders: Order[]
  selectedOrders: Set<string>
  onDeleteSelected: () => void
  onRestoreSelected: () => void
  onRefresh: () => void
  isRefreshing: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  onSelectOrder: (orderId: string) => void
  onSelectAll: () => void
  onViewOrder: (order: Order) => void
}

export function DeletedOrdersPanel({
  title,
  deleteLabel,
  restoreLabel,
  refreshLabel,
  searchPlaceholder,
  orders,
  selectedOrders,
  onDeleteSelected,
  onRestoreSelected,
  onRefresh,
  isRefreshing,
  searchValue,
  onSearchChange,
  onSelectOrder,
  onSelectAll,
  onViewOrder,
}: DeletedOrdersPanelProps) {
  return (
    <div data-testid="deleted-orders-panel" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <IconButton
              label={`${deleteLabel} (${selectedOrders.size})`}
              onClick={onDeleteSelected}
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
              label={`${restoreLabel} (${selectedOrders.size})`}
              onClick={onRestoreSelected}
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
          <RefreshIconButton label={refreshLabel} onClick={onRefresh} isLoading={isRefreshing} iconSize="md" />
          <SearchPanel
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-full sm:w-[260px] md:w-[320px] flex-none basis-full sm:basis-auto"
          />
        </div>
      </div>
      <div className="rounded-md border">
        <OrdersTable
          orders={orders}
          selectedOrders={selectedOrders}
          onSelectOrder={onSelectOrder}
          onSelectAll={onSelectAll}
          onDeleteSelected={onDeleteSelected}
          onViewOrder={onViewOrder}
        />
      </div>
    </div>
  )
}
