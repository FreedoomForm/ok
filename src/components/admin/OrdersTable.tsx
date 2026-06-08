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

    return (
        <div className="space-y-4">
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
                            <TableHead>{t.admin.table.number}</TableHead>
                            <TableHead>{t.admin.table.client}</TableHead>
                            <TableHead>{t.admin.table.address}</TableHead>
                            <TableHead>{t.admin.table.time}</TableHead>
                            <TableHead>{t.admin.table.type}</TableHead>
                            <TableHead>{t.admin.table.amount}</TableHead>
                            <TableHead>{t.admin.table.calories}</TableHead>
                            <TableHead>{t.admin.table.features}</TableHead>
                            <TableHead>{t.admin.table.courier}</TableHead>
                            <TableHead>{t.admin.table.status}</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>ETA</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead>{t.admin.table.payment}</TableHead>
                            <TableHead className="text-right">{t.admin.table.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
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
                        {orders.length === 0 && (
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
