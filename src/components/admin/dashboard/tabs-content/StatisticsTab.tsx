'use client'

import { TabsContent } from '@/components/ui/tabs'
import type { Stats } from '@/components/admin/dashboard/types'

type StatisticsCopy = {
  successful: string
  failed: string
  inDelivery: string
  pending: string
  prepaid: string
  unpaid: string
  card: string
  cash: string
  daily: string
  evenDay: string
  oddDay: string
  special: string
  lowCal: string
  standard: string
  medium: string
  high: string
  max: string
  single: string
  multi: string
}

type StatKey = keyof Stats

type Metric = {
  key: StatKey
  label: string
  sub: string
  color: string
  dot: string
}

function MetricCard({ metric, stats }: { metric: Metric; stats: Stats | null }) {
  return (
    <div className="rounded-base border-2 border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-md ${metric.dot}`} />
        <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
      </div>
      <div className={`text-2xl font-bold ${metric.color}`}>
        {stats?.[metric.key] ?? 0}
      </div>
      <p className="mt-0.5 text-[10px] md:text-xs text-muted-foreground">{metric.sub}</p>
    </div>
  )
}

function MetricGroup({ title, metrics, stats, columns = 'grid-cols-2 lg:grid-cols-4' }: {
  title: string
  metrics: Metric[]
  stats: Stats | null
  columns?: string
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className={`grid gap-3 ${columns}`}>
        {metrics.map((metric) => <MetricCard key={metric.key} metric={metric} stats={stats} />)}
      </div>
    </div>
  )
}

export function StatisticsTab({ stats, copy }: { stats: Stats | null; copy: StatisticsCopy }) {
  const metric = (key: StatKey, label: string, sub: string, color: string, dot: string): Metric => ({
    key,
    label,
    sub,
    color,
    dot,
  })

  return (
    <TabsContent value="statistics" className="space-y-5">
      <MetricGroup
        title={`${copy.successful} / ${copy.failed}`}
        stats={stats}
        metrics={[
          metric('successfulOrders', copy.successful, 'Доставлено', 'text-emerald-600', 'bg-emerald-500'),
          metric('failedOrders', copy.failed, 'Отменено', 'text-rose-600', 'bg-rose-500'),
          metric('inDeliveryOrders', copy.inDelivery, 'В процессе', 'text-blue-600', 'bg-blue-500'),
          metric('pendingOrders', copy.pending, 'В очереди', 'text-amber-600', 'bg-amber-500'),
        ]}
      />
      <MetricGroup
        title={`${copy.prepaid} / ${copy.unpaid}`}
        stats={stats}
        metrics={[
          metric('prepaidOrders', copy.prepaid, 'Оплачено', 'text-emerald-600', 'bg-emerald-500'),
          metric('unpaidOrders', copy.unpaid, 'При получении', 'text-rose-600', 'bg-rose-500'),
          metric('cardOrders', copy.card, 'Онлайн', 'text-blue-600', 'bg-blue-500'),
          metric('cashOrders', copy.cash, 'Наличные', 'text-teal-600', 'bg-teal-500'),
        ]}
      />
      <MetricGroup
        title={copy.daily}
        stats={stats}
        metrics={[
          metric('dailyCustomers', copy.daily, 'Каждый день', 'text-violet-600', 'bg-violet-500'),
          metric('evenDayCustomers', copy.evenDay, 'Четные дни', 'text-indigo-600', 'bg-indigo-500'),
          metric('oddDayCustomers', copy.oddDay, 'Нечетные дни', 'text-pink-600', 'bg-pink-500'),
          metric('specialPreferenceCustomers', copy.special, 'С особенностями', 'text-orange-600', 'bg-orange-500'),
        ]}
      />
      <MetricGroup
        title={copy.lowCal}
        stats={stats}
        metrics={[
          metric('orders1200', copy.lowCal, '1200 ккал', 'text-rose-600', 'bg-rose-500'),
          metric('orders1600', copy.standard, '1600 ккал', 'text-orange-600', 'bg-orange-500'),
          metric('orders2000', copy.medium, '2000 ккал', 'text-yellow-600', 'bg-yellow-500'),
          metric('orders2500', copy.high, '2500 ккал', 'text-emerald-600', 'bg-emerald-500'),
          metric('orders3000', copy.max, '3000 ккал', 'text-blue-600', 'bg-blue-500'),
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <MetricCard metric={metric('singleItemOrders', copy.single, '1 порция', 'text-indigo-600', 'bg-indigo-500')} stats={stats} />
        <MetricCard metric={metric('multiItemOrders', copy.multi, 'Две и более порций', 'text-violet-600', 'bg-violet-500')} stats={stats} />
      </div>
    </TabsContent>
  )
}
