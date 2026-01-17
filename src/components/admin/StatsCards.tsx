import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Package, Users, CalendarDays } from 'lucide-react'

interface Stats {
    successfulOrders: number
    failedOrders: number
    pendingOrders: number
    inDeliveryOrders: number
    dailyCustomers: number
}

interface StatsCardsProps {
    stats: Stats | null
}

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Успешные заказы
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.successfulOrders || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        +20.1% с прошлого месяца
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        В доставке
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.inDeliveryOrders || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Активные заказы сейчас
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Клиенты (Ежедневно)
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.dailyCustomers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Активные подписки
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Ожидают
                    </CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Заказы в очереди
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
