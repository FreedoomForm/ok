'use client'

import { useCallback, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { IconButton } from '@/components/ui/icon-button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Edit } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import dynamic from 'next/dynamic'
import { SortableTableHeader, sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

const TableFilterPanel = dynamic(
  () => import('@/components/ui/table-filter-panel').then((mod) => mod.TableFilterPanel),
  { ssr: false }
)

interface Order {
    id: string
    orderNumber: number
    customer: {
        name: string
        phone: string
    }
    deliveryAddress: string
    latitude?: number
    longitude?: number
    deliveryTime: string
    quantity: number
    calories: number
    specialFeatures: string
    paymentStatus: string
    paymentMethod: string
    orderStatus: string
    isPrepaid: boolean
    priority?: number
    etaMinutes?: number | null
    statusChangedAt?: string
    createdAt: string
    deliveryDate?: string
    isAutoOrder?: boolean
    customerName?: string
    customerPhone?: string
    courierId?: string
    courierName?: string
}

interface OrdersTableProps {
    orders: Order[]
    selectedOrders: Set<string>
    onSelectOrder: (id: string) => void
    onSelectAll: () => void
    onDeleteSelected: () => void
    onViewOrder?: (order: Order) => void
    onEditOrder?: (order: Order) => void
}

export function OrdersTable({
    orders,
    selectedOrders,
    onSelectOrder,
    onSelectAll,
    onDeleteSelected: _onDeleteSelected,
    onViewOrder: _onViewOrder,
    onEditOrder
}: OrdersTableProps) {
    const { t } = useLanguage()

    // Sort & Filter state
    const [sortStates, setSortStates] = useState<Record<string, SortState>>({})
    const [filterOpen, setFilterOpen] = useState(false)
    const [filterValues, setFilterValues] = useState<Record<string, string>>({})

    const columns: SortableColumn[] = useMemo(() => [
        { key: 'number', label: t.admin.table.number, type: 'number' },
        { key: 'client', label: t.admin.table.client, type: 'text' },
        { key: 'address', label: t.admin.table.address, type: 'text' },
        { key: 'time', label: t.admin.table.time, type: 'text' },
        { key: 'type', label: t.admin.table.type, type: 'text' },
        { key: 'amount', label: t.admin.table.amount, type: 'number' },
        { key: 'calories', label: t.admin.table.calories, type: 'number' },
        { key: 'features', label: t.admin.table.features, type: 'text' },
        { key: 'courier', label: t.admin.table.courier, type: 'text' },
        { key: 'status', label: t.admin.table.status, type: 'text' },
        { key: 'priority', label: 'Priority', type: 'number' },
        { key: 'eta', label: 'ETA', type: 'number' },
        { key: 'updated', label: 'Updated', type: 'text' },
        { key: 'payment', label: t.admin.table.payment, type: 'text' },
    ], [t])

    const filterColumns: FilterColumn[] = columns

    const handleSortChange = useCallback((key: string, state: SortState) => {
        setSortStates((prev) => ({ ...prev, [key]: state }))
    }, [])

    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilterValues((prev) => ({ ...prev, [key]: value }))
    }, [])

    const handleClearAllFilters = useCallback(() => {
        setFilterValues({})
    }, [])

    // Flatten order data for sort/filter
    const flatOrders = useMemo(() => orders.map((order) => ({
        id: order.id,
        number: String(order.orderNumber),
        client: order.customer.name,
        address: order.deliveryAddress,
        time: order.deliveryTime,
        type: order.isAutoOrder ? t.admin.auto : t.admin.manual,
        amount: String(order.quantity),
        calories: String(order.calories),
        features: order.specialFeatures || '',
        courier: order.courierName || '',
        status: order.orderStatus,
        priority: String(order.priority ?? 3),
        eta: String(order.etaMinutes ?? ''),
        updated: order.statusChangedAt
            ? new Date(order.statusChangedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '',
        payment: order.paymentStatus,
        _original: order,
    })), [orders, t])

    const processedOrders = useMemo(() => {
        const filtered = applyFilters(flatOrders as unknown as Record<string, unknown>[], filterValues, filterColumns)
        const sorted = sortData(filtered as unknown as Record<string, unknown>[], sortStates, columns)
        return sorted.map((row: Record<string, unknown>) => (row as { _original: Order })._original)
    }, [flatOrders, filterValues, sortStates, filterColumns, columns])

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <TableFilterPanel
                    open={filterOpen}
                    onOpenChange={setFilterOpen}
                    columns={filterColumns}
                    filters={filterValues}
                    onFilterChange={handleFilterChange}
                    onClearAll={handleClearAllFilters}
                    title={t.admin.orders}
                />
            </div>
            <div className="rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="h-9">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={orders.length > 0 && selectedOrders.size === orders.length}
                                    onCheckedChange={onSelectAll}
                                />
                            </TableHead>
                            {columns.map((col) => (
                                <SortableTableHeader
                                    key={col.key}
                                    column={col}
                                    sortState={sortStates[col.key] || 'default'}
                                    onSortChange={handleSortChange}
                                    className={col.key === 'payment' ? 'text-right' : undefined}
                                />
                            ))}
                            <TableHead className="text-right">{t.admin.table.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedOrders.map((order) => (
                            <TableRow key={order.id} className="h-10">
                                <TableCell className="py-1.5">
                                    <Checkbox
                                        checked={selectedOrders.has(order.id)}
                                        onCheckedChange={() => onSelectOrder(order.id)}
                                    />
                                </TableCell>
                                <TableCell className="py-1.5 font-medium">#{order.orderNumber}</TableCell>
                                <TableCell className="py-1.5 max-w-[200px]">
                                    <div className="truncate" title={order.customer.name}>
                                        {order.customer.name}
                                    </div>
                                    <div className="truncate text-sm text-muted-foreground" title={order.customer.phone}>
                                        {order.customer.phone}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate py-1.5" title={order.deliveryAddress}>
                                    {order.deliveryAddress}
                                </TableCell>
                                <TableCell className="py-1.5">{order.deliveryTime}</TableCell>
                                <TableCell className="py-1.5">
                                    <Badge variant="outline">
                                        {order.isAutoOrder ? t.admin.auto : t.admin.manual}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-1.5">{order.quantity}</TableCell>
                                <TableCell className="py-1.5">{order.calories}</TableCell>
                                <TableCell className="max-w-[150px] truncate py-1.5" title={order.specialFeatures}>
                                    {order.specialFeatures || '-'}
                                </TableCell>
                                <TableCell className="max-w-[160px] truncate py-1.5" title={order.courierName || ''}>
                                    {order.courierName || '-'}
                                </TableCell>
                                <TableCell className="py-1.5">
                                    <Badge variant={
                                        order.orderStatus === 'DELIVERED' ? 'default' :
                                            order.orderStatus === 'PENDING' ? 'secondary' :
                                                order.orderStatus === 'IN_DELIVERY' ? 'outline' : 'destructive'
                                    }>
                                        {order.orderStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-1.5">{order.priority ?? 3}</TableCell>
                                <TableCell className="py-1.5">{order.etaMinutes ? `${order.etaMinutes} min` : '-'}</TableCell>
                                <TableCell className="py-1.5 text-xs text-muted-foreground">
                                    {order.statusChangedAt
                                        ? new Date(order.statusChangedAt).toLocaleString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '-'}
                                </TableCell>
                                <TableCell className="py-1.5">
                                    <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'destructive'}>
                                        {order.paymentStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 text-right">
                                    <IconButton
                                        label={t.admin.edit}
                                        variant="outline"
                                        iconSize="sm"
                                        onClick={() => onEditOrder?.(order)}
                                    >
                                        <Edit className="size-4" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {processedOrders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={16} className="h-24 text-center">
                                    {t.admin.noOrders}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
