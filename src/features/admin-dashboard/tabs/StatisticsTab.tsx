'use client'

import type { Stats } from '@/features/admin-dashboard/model'

export interface StatisticsTabProps {
  stats: Stats | null
  t: {
    admin: {
      stats: {
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
      statsLabels: {
        delivered: string
        cancelled: string
        inProgress: string
        inQueue: string
        paid: string
        onDelivery: string
        online: string
        cashPayment: string
      }
    }
  }
}

export function StatisticsTab({ stats, t }: StatisticsTabProps) {
  return (
    <>
      {/* ── Order Status ── */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.successful} / {t.admin.stats.failed}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t.admin.stats.successful, value: stats?.successfulOrders || 0, sub: t.admin.statsLabels.delivered, color: 'text-emerald-600', dot: 'bg-emerald-500' },
            { label: t.admin.stats.failed, value: stats?.failedOrders || 0, sub: t.admin.statsLabels.cancelled, color: 'text-rose-600', dot: 'bg-rose-500' },
            { label: t.admin.stats.inDelivery, value: stats?.inDeliveryOrders || 0, sub: t.admin.statsLabels.inProgress, color: 'text-blue-600', dot: 'bg-blue-500' },
            { label: t.admin.stats.pending, value: stats?.pendingOrders || 0, sub: t.admin.statsLabels.inQueue, color: 'text-amber-600', dot: 'bg-amber-500' },
          ].map((s) => (
            <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment Stats ── */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.prepaid} / {t.admin.stats.unpaid}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t.admin.stats.prepaid, value: stats?.prepaidOrders || 0, sub: t.admin.statsLabels.paid, color: 'text-emerald-600', dot: 'bg-emerald-500' },
            { label: t.admin.stats.unpaid, value: stats?.unpaidOrders || 0, sub: t.admin.statsLabels.onDelivery, color: 'text-rose-600', dot: 'bg-rose-500' },
            { label: t.admin.stats.card, value: stats?.cardOrders || 0, sub: t.admin.statsLabels.online, color: 'text-blue-600', dot: 'bg-blue-500' },
            { label: t.admin.stats.cash, value: stats?.cashOrders || 0, sub: t.admin.statsLabels.cashPayment, color: 'text-teal-600', dot: 'bg-teal-500' },
          ].map((s) => (
            <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Customer Stats ── */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.daily}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t.admin.stats.daily, value: stats?.dailyCustomers || 0, sub: 'Каждый день', color: 'text-violet-600', dot: 'bg-violet-500' },
            { label: t.admin.stats.evenDay, value: stats?.evenDayCustomers || 0, sub: 'Чётные дни', color: 'text-indigo-600', dot: 'bg-indigo-500' },
            { label: t.admin.stats.oddDay, value: stats?.oddDayCustomers || 0, sub: 'Нечётные дни', color: 'text-pink-600', dot: 'bg-pink-500' },
            { label: t.admin.stats.special, value: stats?.specialPreferenceCustomers || 0, sub: 'С особенностями', color: 'text-orange-600', dot: 'bg-orange-500' },
          ].map((s) => (
            <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calories ── */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.admin.stats.lowCal}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: t.admin.stats.lowCal, value: stats?.orders1200 || 0, sub: '1200 ккал', color: 'text-rose-600', dot: 'bg-rose-500' },
            { label: t.admin.stats.standard, value: stats?.orders1600 || 0, sub: '1600 ккал', color: 'text-orange-600', dot: 'bg-orange-500' },
            { label: t.admin.stats.medium, value: stats?.orders2000 || 0, sub: '2000 ккал', color: 'text-yellow-600', dot: 'bg-yellow-500' },
            { label: t.admin.stats.high, value: stats?.orders2500 || 0, sub: '2500 ккал', color: 'text-emerald-600', dot: 'bg-emerald-500' },
            { label: t.admin.stats.max, value: stats?.orders3000 || 0, sub: '3000 ккал', color: 'text-blue-600', dot: 'bg-blue-500' },
          ].map((s) => (
            <div key={s.label} className="dense-card-compact hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Item Count ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t.admin.stats.single, value: stats?.singleItemOrders || 0, sub: '1 порция', color: 'text-indigo-600', dot: 'bg-indigo-500' },
          { label: t.admin.stats.multi, value: stats?.multiItemOrders || 0, sub: 'Два и более рационов', color: 'text-violet-600', dot: 'bg-violet-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-base bg-card p-4 shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block h-2 w-2 rounded-md ${s.dot}`} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </>
  )
}
