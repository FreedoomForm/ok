import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Trash2, Eye, Edit, Calendar, MapPin, Phone, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    onDeleteSelected,
    onViewOrder,
    onEditOrder
}: OrdersTableProps) {
    const { t } = useLanguage()

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{t.admin.orders}</h2>
                {selectedOrders.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t.admin.deleteSelected} ({selectedOrders.size})
                    </Button>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
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
                            <TableHead>{t.admin.table.payment}</TableHead>
                            <TableHead className="text-right">{t.admin.table.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedOrders.has(order.id)}
                                        onCheckedChange={() => onSelectOrder(order.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                                <TableCell>
                                    <div>{order.customer.name}</div>
                                    <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={order.deliveryAddress}>
                                    {order.deliveryAddress}
                                </TableCell>
                                <TableCell>{order.deliveryTime}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {order.isAutoOrder ? t.admin.auto : t.admin.manual}
                                    </Badge>
                                </TableCell>
                                <TableCell>{order.quantity}</TableCell>
                                <TableCell>{order.calories}</TableCell>
                                <TableCell className="max-w-[150px] truncate" title={order.specialFeatures}>
                                    {order.specialFeatures || '-'}
                                </TableCell>
                                <TableCell>
                                    {order.courierName || '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        order.orderStatus === 'DELIVERED' ? 'default' :
                                            order.orderStatus === 'PENDING' ? 'secondary' :
                                                order.orderStatus === 'IN_DELIVERY' ? 'outline' : 'destructive'
                                    }>
                                        {order.orderStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'destructive'}>
                                        {order.paymentStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => onViewOrder?.(order)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onEditOrder?.(order)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={13} className="h-24 text-center">
                                    {t.admin.noOrders}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {t.admin.noOrders}
                    </div>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="overflow-hidden">
                            <CardHeader className="pb-2 bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={selectedOrders.has(order.id)}
                                            onCheckedChange={() => onSelectOrder(order.id)}
                                        />
                                        <CardTitle className="text-base">
                                            {t.courier.orderNumber}{order.orderNumber}
                                        </CardTitle>
                                    </div>
                                    <Badge variant={
                                        order.orderStatus === 'DELIVERED' ? 'default' :
                                            order.orderStatus === 'PENDING' ? 'secondary' :
                                                order.orderStatus === 'IN_DELIVERY' ? 'outline' : 'destructive'
                                    }>
                                        {order.orderStatus}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">{order.customer.name}</div>
                                        <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                                    <div className="text-sm">{order.deliveryAddress}</div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <div className="text-sm">
                                        {order.deliveryTime}
                                        {order.deliveryDate && ` • ${order.deliveryDate}`}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                    <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'destructive'}>
                                        {order.paymentStatus === 'PAID' ? t.common.paid : t.common.notPaid}
                                    </Badge>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewOrder?.(order)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditOrder?.(order)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
