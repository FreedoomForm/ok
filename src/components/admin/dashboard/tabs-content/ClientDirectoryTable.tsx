import { Edit, MessageSquare } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { CustomerChatThreadDialog } from '@/components/admin/CustomersChatThreadDialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EntityStatusBadge } from '@/components/admin/dashboard/shared/EntityStatusBadge'
import { TabEmptyState } from '@/components/admin/dashboard/shared/TabEmptyState'
import type { Client, Order } from '@/components/admin/dashboard/types'

export interface ClientDirectoryTableLabels {
  name: string
  nickname: string
  phone: string
  balance: string
  days: string
  address: string
  status: string
  actions: string
  active: string
  paused: string
  calories: string
  orders: string
  deliveryDays: string
  notes: string
  created: string
  emptyTitle: string
  emptyDescription: string
  chatThread: {
    title: string
    administrator: string
    customer: string
    inputLabel: string
    send: string
    empty: string
    you: string
    failedLoad: string
    failedSend: string
    open: string
  }
}

export interface ClientDirectoryFinance {
  balance: number
  dailyPrice: number
}

export interface ClientDirectoryTableProps {
  clients: Client[]
  orders: Order[]
  selectedClientIds: ReadonlySet<string>
  clientFinanceById: Record<string, ClientDirectoryFinance>
  isClientFinanceLoading: boolean
  dateLocale: string
  labels: ClientDirectoryTableLabels
  onSelectAll: (selected: boolean) => void
  onToggleSelection: (clientId: string) => void
  onToggleStatus: (clientId: string, isActive: boolean) => void
  onEdit: (client: Client) => void
  onOpenDetail: (client: Client) => void
}

const DELIVERY_DAYS = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
] as const satisfies ReadonlyArray<[keyof Client['deliveryDays'], string]>

function getOrderCounts(orders: Order[], phone: string) {
  const clientOrders = orders.filter((order) => order.customerPhone === phone)
  const delivered = clientOrders.filter((order) => order.orderStatus === 'DELIVERED').length
  const active = clientOrders.filter((order) =>
    ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED'].includes(order.orderStatus),
  ).length

  return {
    delivered,
    active,
    failed: clientOrders.length - delivered - active,
  }
}

export function ClientDirectoryTable({
  clients,
  orders,
  selectedClientIds,
  clientFinanceById,
  isClientFinanceLoading,
  dateLocale,
  labels,
  onSelectAll,
  onToggleSelection,
  onToggleStatus,
  onEdit,
  onOpenDetail,
}: ClientDirectoryTableProps) {
  const [chatThreadCustomer, setChatThreadCustomer] = useState<{ id: string; name: string } | null>(null)
  const allVisibleSelected = clients.length > 0 && selectedClientIds.size === clients.length
  const someVisibleSelected = selectedClientIds.size > 0

  return (
    <div className="rounded-md border">
      <div className="max-h-96 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-9">
              <TableHead className="w-[44px] px-2">
                <Checkbox
                  aria-label="Select all clients"
                  checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                />
              </TableHead>
              <TableHead>{labels.name}</TableHead>
              <TableHead>{labels.nickname}</TableHead>
              <TableHead>{labels.phone}</TableHead>
              <TableHead className="text-right">{labels.balance}</TableHead>
              <TableHead className="text-right">{labels.days}</TableHead>
              <TableHead>{labels.address}</TableHead>
              <TableHead>{labels.calories}</TableHead>
              <TableHead className="text-center">{labels.orders}</TableHead>
              <TableHead>{labels.deliveryDays}</TableHead>
              <TableHead>{labels.status}</TableHead>
              <TableHead>{labels.notes}</TableHead>
              <TableHead>{labels.created}</TableHead>
              <TableHead className="text-right">{labels.actions}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {clients.map((client) => {
              const finance = clientFinanceById[client.id]
              const balance = finance && Number.isFinite(finance.balance) ? Math.round(finance.balance) : null
              const dailyPrice = finance?.dailyPrice || client.dailyPrice || 0
              const days = balance !== null && dailyPrice > 0 ? Math.floor(balance / dailyPrice) : null
              const orderCounts = getOrderCounts(orders, client.phone)

              return (
                <TableRow key={client.id} className="h-10">
                  <TableCell className="px-2 py-1.5">
                    <Checkbox
                      aria-label={`Select client ${client.name}`}
                      checked={selectedClientIds.has(client.id)}
                      onCheckedChange={() => onToggleSelection(client.id)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate py-1.5 font-medium" title={client.name}>
                    <button
                      type="button"
                      className="max-w-full truncate text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onOpenDetail(client)}
                    >
                      {client.name}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate py-1.5 text-muted-foreground" title={client.nickName || ''}>
                    {client.nickName || '-'}
                  </TableCell>
                  <TableCell className="py-1.5">{client.phone}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {balance === null ? (
                      isClientFinanceLoading ? '...' : '-'
                    ) : (
                      <span className={balance < 0 ? 'font-medium text-rose-600' : 'font-medium text-emerald-600'}>
                        {balance.toLocaleString(dateLocale)} UZS
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {days === null ? (
                      isClientFinanceLoading ? '...' : '-'
                    ) : (
                      <span className={days < 0 ? 'font-medium text-rose-600' : 'font-medium text-muted-foreground'}>
                        {days}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate py-1.5" title={client.address}>
                    {client.address}
                  </TableCell>
                  <TableCell className="py-1.5">{client.calories} kcal</TableCell>
                  <TableCell className="py-1.5 text-center">
                    {orderCounts.delivered + orderCounts.active + orderCounts.failed === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-xs">
                        {orderCounts.delivered > 0 && (
                          <span className="font-bold text-emerald-600" title="Delivered">{orderCounts.delivered}</span>
                        )}
                        {orderCounts.failed > 0 && (
                          <span className="font-bold text-rose-600" title="Failed/Not Delivered">{orderCounts.failed}</span>
                        )}
                        {orderCounts.active > 0 && (
                          <span className="font-bold text-amber-500" title="Active">{orderCounts.active}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="text-xs">
                      {DELIVERY_DAYS.map(([key, label]) =>
                        client.deliveryDays?.[key] ? (
                          <span key={key} className="mr-1 inline-flex items-center rounded-sm border bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                            {label}
                          </span>
                        ) : null,
                      )}
                      {(!client.deliveryDays || Object.values(client.deliveryDays).every((day) => !day)) && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <EntityStatusBadge
                      isActive={client.isActive}
                      activeLabel={labels.active}
                      inactiveLabel={labels.paused}
                      inactiveTone="danger"
                      showDot
                      onClick={() => onToggleStatus(client.id, client.isActive)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate py-1.5" title={client.specialFeatures || ''}>
                    {client.specialFeatures || '-'}
                  </TableCell>
                  <TableCell className="py-1.5">{new Date(client.createdAt).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="py-1.5 text-right">
                    <Button variant="outline" size="icon" className="h-8 w-8" aria-label={labels.chatThread.open} title={labels.chatThread.open} data-reference-customer-chat={client.id} onClick={() => setChatThreadCustomer({ id: client.id, name: client.name })}>
                      <MessageSquare className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="ml-1 h-8 w-8" aria-label="Редактировать" onClick={() => onEdit(client)}>
                      <Edit className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}

            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">
                  <TabEmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {chatThreadCustomer && (
        <CustomerChatThreadDialog
          customerId={chatThreadCustomer.id}
          customerName={chatThreadCustomer.name}
          open
          onOpenChange={(next) => {
            if (!next) setChatThreadCustomer(null)
          }}
          labels={labels.chatThread}
        />
      )}
    </div>
  )
}
