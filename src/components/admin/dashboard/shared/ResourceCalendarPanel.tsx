'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { availabilityForDate, normalizeIsoDate, type ResourceAvailabilityOverride, type ResourceState } from '@/lib/resources/availability'
import { collectEnabledPeriodFirstDays, type ContractPeriodMarker, type PeriodFirstDayMarker } from '@/lib/contracts/period-markers'

export type ResourceCalendarKind =
  | 'INGREDIENT' | 'SET' | 'GROUP' | 'CLIENT' | 'COURIER' | 'ADMIN' | 'CONTRACT'
  | 'TRANSACTION' | 'VIRTUAL_CARD' | 'DISH' | 'ORDER' | 'PURCHASE' | 'CHAT_CONTACT' | 'CHAT_MESSAGE' | 'CONTRACT_PERIOD' | 'COOKING_RECORD' | 'ROUTE' | 'ROUTE_STOP'

export type ResourceCalendarPanelProps = {
  resourceType: ResourceCalendarKind
  resourceId: string
  days?: number
  compact?: boolean
  forcedState?: ResourceState
  initialDate?: string
  periodMarkers?: readonly ContractPeriodMarker[]
}

function localIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ResourceCalendarPanel({ resourceType, resourceId, days = 7, compact = false, forcedState, initialDate, periodMarkers }: ResourceCalendarPanelProps) {
  const { language } = useLanguage()
  const [overrides, setOverrides] = useState<ResourceAvailabilityOverride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingDate, setSavingDate] = useState<string | null>(null)
  const [rangeStart, setRangeStart] = useState(() => {
    const candidate = initialDate ? new Date(`${initialDate.slice(0, 10)}T00:00:00`) : new Date()
    candidate.setHours(0, 0, 0, 0)
    return candidate
  })
  const dates = useMemo(() => Array.from({ length: Math.max(1, Math.min(days, 31)) }, (_, index) => {
    const date = new Date(rangeStart)
    date.setDate(date.getDate() + index)
    return localIsoDate(date)
  }), [days, rangeStart])
  const dateLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'ru-RU'
  const labels = language === 'ru'
    ? { enabled: 'Включен', disabled: 'Отключен', loading: 'Загрузка', calendar: 'Календарь', previous: 'Предыдущий период', next: 'Следующий период', periodFirstDay: 'Первый день периода' }
    : { enabled: 'Yoqilgan', disabled: "O'chirilgan", loading: 'Yuklanmoqda', calendar: 'Kalendar', previous: 'Oldingi davr', next: 'Keyingi davr', periodFirstDay: 'Davrning birinchi kuni' }

  const fetchOverrides = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/resource-availability?resourceType=${resourceType}&resourceId=${encodeURIComponent(resourceId)}&from=${dates[0]}&to=${dates.at(-1)}`)
      if (!response.ok) return
      const data = await response.json()
      setOverrides(Array.isArray(data?.overrides) ? data.overrides : [])
    } finally {
      setIsLoading(false)
    }
  }, [dates, resourceId, resourceType])

  useEffect(() => {
    void fetchOverrides()
  }, [fetchOverrides])

  async function toggleDate(date: string) {
    const current = availabilityForDate(overrides, date)
    const next: ResourceState = forcedState ?? (current === 'ENABLED' ? 'DISABLED' : 'ENABLED')
    setSavingDate(date)
    try {
      const response = await fetch('/api/admin/resource-availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType, resourceId, date, state: next }),
      })
      if (response.ok) {
        setOverrides((previous) => {
          const withoutDate = previous.filter((override) => normalizeIsoDate(override.date) !== date)
          return [...withoutDate, { date, state: next }].sort((left, right) => left.date.localeCompare(right.date))
        })
      }
    } finally {
      setSavingDate(null)
    }
  }

  const shiftRange = (daysToShift: number) => {
    setRangeStart((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + daysToShift)
      return next
    })
  }

  const firstDayMarkers = useMemo(() => {
    const effectiveStateFor = (marker: ContractPeriodMarker, date: string) =>
      availabilityForDate(overrides, date) === 'ENABLED'
    return collectEnabledPeriodFirstDays(periodMarkers ?? [], dates, effectiveStateFor)
  }, [dates, overrides, periodMarkers])
  const markersByDate = useMemo(() => new Map(firstDayMarkers.map((marker) => [marker.date, marker])), [firstDayMarkers])

  return (
    <div className={cn('space-y-1.5', compact ? 'text-[11px]' : 'text-xs')} data-reference-calendar="true">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-muted-foreground">{labels.calendar}</p>
        {!compact ? (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label={labels.previous} title={labels.previous} onClick={() => shiftRange(-Math.max(1, Math.min(days, 31)))} className="size-9 rounded-lg border border-transparent p-0 text-muted-foreground shadow-none hover:bg-accent active:scale-[.95]"><ChevronLeft className="size-5" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={labels.next} title={labels.next} onClick={() => shiftRange(Math.max(1, Math.min(days, 31)))} className="size-9 rounded-lg border border-transparent p-0 text-muted-foreground shadow-none hover:bg-accent active:scale-[.95]"><ChevronRight className="size-5" /></Button>
          </div>
        ) : null}
      </div>
      {isLoading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label={labels.loading} /> : dates.map((date) => {
        const state = availabilityForDate(overrides, date)
        const disabled = state === 'DISABLED'
        const firstDayMarker: PeriodFirstDayMarker | undefined = markersByDate.get(date)
        const markerTitle = firstDayMarker
          ? `${labels.periodFirstDay}${firstDayMarker.courierName ? ` · ${firstDayMarker.courierName}` : ''}`
          : undefined
        return (
          <button
            key={date}
            type="button"
            disabled={savingDate === date}
            onClick={() => void toggleDate(date)}
            data-period-first-day={firstDayMarker?.markerId}
            style={firstDayMarker ? { boxShadow: `inset 3px 0 0 ${firstDayMarker.color || '#2563eb'}` } : undefined}
            title={markerTitle}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300' : 'border-green-200 bg-green-50 text-green-700 dark:border-green-950 dark:bg-green-950/30 dark:text-green-300',
            )}
          >
            <span>
              {new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' })}
              {markerTitle ? <span className="sr-only"> · {markerTitle}</span> : null}
            </span>
            <span className="flex items-center gap-1">
              {disabled ? <CircleOff className="size-3" aria-hidden="true" /> : <Check className="size-3" aria-hidden="true" />}
              {disabled ? labels.disabled : labels.enabled}
            </span>
          </button>
        )
      })}
    </div>
  )
}
