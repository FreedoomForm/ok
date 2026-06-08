'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type MetricTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const toneClassMap: Record<MetricTone, string> = {
 neutral: ' bg-card',
 primary: ' bg-card',
 success: ' bg-card',
 warning: ' bg-card',
 danger: ' bg-card',
}

export type SectionMetric = {
  id: string
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  tone?: MetricTone
}

export function SectionMetrics({
  items,
  columnsClassName = 'sm:grid-cols-2 xl:grid-cols-4',
}: {
  items: SectionMetric[]
  columnsClassName?: string
}) {
  return (
    <div className={cn('grid gap-3', columnsClassName)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
 'rounded-xl px-4 py-3 shadow-sm transition-colors hover:bg-muted/20',
            toneClassMap[item.tone ?? 'neutral']
          )}
        >
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{item.label}</span>
            <span className="text-foreground/70">{item.icon}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold">{item.value}</p>
          {item.helper && <p className="mt-0.5 text-xs text-muted-foreground">{item.helper}</p>}
        </div>
      ))}
    </div>
  )
}
