'use client'

import { Users, TrendingUp, Clock, Truck } from 'lucide-react'

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

const cardMeta = [
  { title: 'Успешные заказы', key: 'successfulOrders' as const, description: 'Доставлено', Icon: TrendingUp, accentColor: 'text-emerald-600 dark:text-emerald-400' },
  { title: 'В доставке', key: 'inDeliveryOrders' as const, description: 'Активные сейчас', Icon: Truck, accentColor: 'text-blue-600 dark:text-blue-400' },
  { title: 'Клиенты', key: 'dailyCustomers' as const, description: 'Ежедневные подписки', Icon: Users, accentColor: 'text-violet-600 dark:text-violet-400' },
  { title: 'Ожидают', key: 'pendingOrders' as const, description: 'В очереди', Icon: Clock, accentColor: 'text-amber-600 dark:text-amber-400' },
] as const

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cardMeta.map(({ title, key, description, Icon, accentColor }) => (
        <div key={title} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground">{title}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <Icon className={`h-4 w-4 ${accentColor}`} aria-hidden="true" />
            </span>
          </div>
          <div className={`mt-4 text-3xl font-bold tracking-tight ${accentColor}`}>
            {stats?.[key] ?? 0}
          </div>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  )
}
