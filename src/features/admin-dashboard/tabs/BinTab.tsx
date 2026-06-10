'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { IconButton } from '@/components/ui/icon-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  History,
  Trash2,
} from 'lucide-react'
import type { Order } from '@/features/admin-dashboard/model'
import type { ProfileUiText } from '@/features/admin-dashboard/shell/types'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'
import { EmptyState } from '@/components/ui/states'

const OrdersTable = dynamic(
  () => import('@/components/admin/OrdersTable').then((mod) => mod.OrdersTable),
  { ssr: false, loading: () => <div className="p-4 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div> }
)

export interface BinTabProps {
  // Bin orders data
  visibleBinOrders: any[]
  binOrdersSearch: string
  setBinOrdersSearch: (term: string) => void
  isBinOrdersRefreshing: boolean

  // Bin clients data
  visibleBinClients: any[]
  binClientsSearch: string
  setBinClientsSearch: (term: string) => void
  isBinClientsRefreshing: boolean

  // Selection
  selectedOrders: Set<string>
  selectedBinClients: Set<string>
  setSelectedBinClients: React.Dispatch<React.SetStateAction<Set<string>>>

  // Callbacks — orders
  onPermanentDeleteOrders: () => void
  onRestoreSelectedOrders: () => void
  onRefreshBinOrders: () => void
  onSelectOrder: (orderId: string) => void
  onSelectAllBinOrders: () => void
  onViewOrder: (order: Order) => void

  // Callbacks — clients
  onPermanentDeleteClients: () => void
  onRestoreSelectedClients: () => void
  onRefreshBinClients: () => void

  // Translations
  t: any
  language: string
  profileUiText: ProfileUiText
}

export function BinTab({
  visibleBinOrders,
  binOrdersSearch,
  setBinOrdersSearch,
  isBinOrdersRefreshing,
  visibleBinClients,
  binClientsSearch,
  setBinClientsSearch,
  isBinClientsRefreshing,
  selectedOrders,
  selectedBinClients,
  setSelectedBinClients,
  onPermanentDeleteOrders,
  onRestoreSelectedOrders,
  onRefreshBinOrders,
  onSelectOrder,
  onSelectAllBinOrders,
  onViewOrder,
  onPermanentDeleteClients,
  onRestoreSelectedClients,
  onRefreshBinClients,
  t,
  language,
  profileUiText,
}: BinTabProps) {
  return (
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
                onClick={onPermanentDeleteOrders}
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
                onClick={onRestoreSelectedOrders}
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
              onClick={() => void onRefreshBinOrders()}
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
          {visibleBinOrders.length === 0 ? (
            <EmptyState
              title={t.admin.noDeletedOrders || 'No deleted orders'}
              description="Deleted orders will appear here"
            />
          ) : (
          <OrdersTable
            orders={visibleBinOrders}
            selectedOrders={selectedOrders}
            onSelectOrder={onSelectOrder}
            onSelectAll={onSelectAllBinOrders}
            onDeleteSelected={onPermanentDeleteOrders}
            onViewOrder={onViewOrder}
          />
          )}
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
                onClick={onPermanentDeleteClients}
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
                onClick={onRestoreSelectedClients}
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
              onClick={() => void onRefreshBinClients()}
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
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        title={t.finance.noClients || 'No deleted clients'}
                        description="Deleted clients will appear here"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
