'use client'

import { Users, TrendingUp, Clock, Truck } from 'lucide-react'
import { Card } from '@/components/ui/card'

/* ═════════════════════════════════════════════
   IA-first Dense UX — Stats Cards
   Law 6: антишум — убираем градиенты, glow, blur
 Law 40: фигура и фон — separation, no heavy shadow
   Law 66: семантика цвета — success/info/warning
   
 Card: , 12px radius, 16px padding
   Value: 28px, tabular-nums
   Label: 12px caption, muted
   Icon: 20px, semantic color background
   ═════════════════════════════════════════════ */

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
  {
    title: 'Успешные заказы',
    key: 'successfulOrders' as const,
    description: 'Доставлено',
    Icon: TrendingUp,
    iconBg: 'bg-success-bg',
    iconColor: 'text-success',
    valueColor: 'text-success',
  },
  {
    title: 'В доставке',
    key: 'inDeliveryOrders' as const,
    description: 'Активные сейчас',
    Icon: Truck,
    iconBg: 'bg-info-bg',
    iconColor: 'text-info',
    valueColor: 'text-info',
  },
  {
    title: 'Клиенты',
    key: 'dailyCustomers' as const,
    description: 'Ежедневные подписки',
    Icon: Users,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
    valueColor: 'text-primary-600',
  },
  {
    title: 'Ожидают',
    key: 'pendingOrders' as const,
    description: 'В очереди',
    Icon: Clock,
    iconBg: 'bg-warning-bg',
    iconColor: 'text-warning',
    valueColor: 'text-warning',
  },
] as const

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cardMeta.map(({ title, key, description, Icon, iconBg, iconColor, valueColor }) => (
        <Card
          key={title}
          className="p-4 hover:bg-[var(--color-bg-muted)] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption text-muted-hierarchy font-medium">{title}</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
            </div>
          </div>
          <div className={`mt-3 text-2xl font-bold tabular-nums ${valueColor} tracking-tight`}>
            {stats?.[key] ?? 0}
          </div>
          <p className="mt-1 text-caption text-muted-hierarchy">{description}</p>
        </Card>
      ))}
    </div>
  )
}
