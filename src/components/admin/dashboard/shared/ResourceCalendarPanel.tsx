'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { availabilityForDate, formatOverrideSource, normalizeIsoDate, type ResourceAvailabilityOverride, type ResourceState } from '@/lib/resources/availability'
import { collectEnabledPeriodFirstDays, type ContractPeriodMarker, type PeriodFirstDayMarker } from '@/lib/contracts/period-markers'
import { computePeriodBoundaryMarkers, type PeriodBoundaryMarker } from '@/lib/contracts/period-boundaries'
import { computeRenewalExtensionDay, decideContractDay, type ContractDayOverride, type ContractDaySource, type EffectiveContractPeriodInput } from '@/lib/contracts/effective-period'
import { getCourierColor } from '@/lib/courier-colors'

export type ResourceCalendarKind =
  | 'INGREDIENT' | 'SET' | 'GROUP' | 'CLIENT' | 'COURIER' | 'ADMIN' | 'CONTRACT'
  | 'TRANSACTION' | 'VIRTUAL_CARD' | 'DISH' | 'ORDER' | 'PURCHASE' | 'CHAT_CONTACT' | 'CHAT_MESSAGE' | 'CONTRACT_PERIOD' | 'COOKING_RECORD' | 'ROUTE' | 'ROUTE_STOP'

export type ResourceCalendarContractPeriod = EffectiveContractPeriodInput & {
  color?: string | null
  courierName?: string | null
}

export type ResourceCalendarContractTimeline = {
  contractEnabled: boolean
  contractAutoRenew: boolean
  periods: readonly ResourceCalendarContractPeriod[]
}

export type ResourceCalendarPanelProps = {
  resourceType: ResourceCalendarKind
  resourceId: string
  days?: number
  compact?: boolean
  forcedState?: ResourceState
  initialDate?: string
  periodMarkers?: readonly ContractPeriodMarker[]
  contractTimeline?: ResourceCalendarContractTimeline
}

function localIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const AMBER_ENABLED_CLASSES = 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
const RED_DISABLED_CLASSES = 'border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300'

export function ResourceCalendarPanel({ resourceType, resourceId, days = 7, compact = false, forcedState, initialDate, periodMarkers, contractTimeline }: ResourceCalendarPanelProps) {
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
    ? { enabled: 'Включен', disabled: 'Отключен', loading: 'Загрузка', calendar: 'Календарь', previous: 'Предыдущий период', next: 'Следующий период', periodFirstDay: 'Первый день периода', source: 'Источник', boundary: 'Граница периода', renewal: 'Продление +7', cascade: 'каскад', period: 'период' }
    : { enabled: 'Yoqilgan', disabled: "O'chirilgan", loading: 'Yuklanmoqda', calendar: 'Kalendar', previous: 'Oldingi davr', next: 'Keyingi davr', periodFirstDay: 'Davrning birinchi kuni', source: 'Manba', boundary: 'Davr chegarasi', renewal: 'Uzaytirish +7', cascade: 'kaskad', period: 'davr' }

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

  // C5 / §3.3: when the caller supplies the contract timeline the calendar
  // switches to the contract view — amber enabled period days, red cascaded
  // days, virtual boundary markers, the courier-coloured band and the +7
  // renewal day. Everything stays derived from the fetched overrides.
  const contractView = resourceType === 'CONTRACT' && contractTimeline ? contractTimeline : null
  const contractOverrides = useMemo<ContractDayOverride[]>(() => (
    overrides.map((override) => ({ date: normalizeIsoDate(override.date), state: override.state }))
  ), [overrides])

  const boundaryMarkersByDate = useMemo(() => {
    const map = new Map<string, PeriodBoundaryMarker>()
    if (!contractView) return map
    for (const period of contractView.periods) {
      for (const marker of computePeriodBoundaryMarkers(period, contractOverrides, dates, contractView.contractEnabled)) {
        if (!map.has(marker.date)) map.set(marker.date, marker)
      }
    }
    return map
  }, [contractOverrides, contractView, dates])

  const periodDecisionsByDate = useMemo(() => {
    const map = new Map<string, { enabled: boolean; source: ContractDaySource; color: string | null; courierName: string | null; periodId: string }>()
    if (!contractView) return map
    for (const period of contractView.periods) {
      const bandColor = period.courierId ? getCourierColor(period.courierId) : (period.color || '#2563eb')
      for (const date of dates) {
        const decision = decideContractDay(
          { status: contractView.contractEnabled ? 'ENABLED' : 'DISABLED', periods: contractView.periods },
          period,
          contractOverrides,
          date,
        )
        if (decision.source === 'NO_PERIOD' || decision.source === 'CONTRACT_DISABLED') continue
        map.set(date, { enabled: decision.enabled, source: decision.source, color: bandColor, courierName: period.courierName ?? null, periodId: period.id })
      }
    }
    return map
  }, [contractOverrides, contractView, dates])

  const renewalDay = useMemo(() => {
    if (!contractView) return null
    return computeRenewalExtensionDay(
      { status: contractView.contractEnabled ? 'ENABLED' : 'DISABLED', autoRenew: contractView.contractAutoRenew, periods: contractView.periods },
      contractView.periods,
    )
  }, [contractView])
  // R11: the virtual "+7" tile renders right after the last enabled period's
  // end date when that day is visible in the current window.
  const lastEnabledPeriodEnd = useMemo(() => {
    if (!contractView) return null
    return contractView.periods
      .filter((period) => period.status === 'ENABLED')
      .map((period) => period.endDate.slice(0, 10))
      .sort((left, right) => left.localeCompare(right))
      .at(-1) ?? null
  }, [contractView])

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
        const overrideReason = overrides.find((override) => normalizeIsoDate(override.date) === date)?.reason ?? null
        const overrideTitle = formatOverrideSource(state, overrideReason, { enabled: labels.enabled, disabled: labels.disabled, source: labels.source })

        if (contractView) {
          const boundaryMarker = boundaryMarkersByDate.get(date)
          const periodDecision = periodDecisionsByDate.get(date)
          if (boundaryMarker && !periodDecision) {
            const markerEnabled = boundaryMarker.state === 'ENABLED'
            return (
              <div
                key={date}
                data-calendar-date={date}
                data-virtual-marker={boundaryMarker.state}
                title={`${labels.boundary} · ${markerEnabled ? labels.enabled : labels.disabled}`}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded border border-dashed px-2 py-1',
                  markerEnabled ? AMBER_ENABLED_CLASSES : RED_DISABLED_CLASSES,
                )}
              >
                <span>{new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                <span>{labels.boundary}</span>
              </div>
            )
          }
          const effectivelyEnabled = periodDecision?.enabled ?? false
          const isCascade = periodDecision?.source === 'CASCADE_DISABLED'
          const periodTile = Boolean(periodDecision)
          const bandColor = periodDecision?.color ?? null
          const effectiveTitle = periodTile
            ? `${effectivelyEnabled ? labels.enabled : labels.disabled}${isCascade ? ` · ${labels.cascade}` : ` · ${labels.period}`}${periodDecision?.courierName ? ` · ${periodDecision.courierName}` : ''}`
            : (overrideReason ? overrideTitle : markerTitle)
          const renewalFollows = renewalDay !== null && lastEnabledPeriodEnd !== null && date === lastEnabledPeriodEnd
          return (
            <div key={date} className="space-y-1">
              <button
                type="button"
                disabled={savingDate === date}
                onClick={() => void toggleDate(date)}
                data-calendar-date={date}
                data-effective-state={periodTile ? (effectivelyEnabled ? 'ENABLED' : 'DISABLED') : undefined}
                data-cascade={isCascade || undefined}
                data-period-first-day={firstDayMarker?.markerId}
                data-override-source={overrideReason ? overrideTitle : undefined}
                style={{
                  ...(firstDayMarker ? { boxShadow: `inset 3px 0 0 ${firstDayMarker.color || '#2563eb'}` } : bandColor ? { boxShadow: `inset 3px 0 0 ${bandColor}` } : undefined),
                  ...(firstDayMarker ? { borderTop: `3px solid ${firstDayMarker.color || '#2563eb'}` } : undefined),
                }}
                title={effectiveTitle}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  periodTile
                    ? effectivelyEnabled
                      ? AMBER_ENABLED_CLASSES
                      : RED_DISABLED_CLASSES
                    : disabled
                      ? RED_DISABLED_CLASSES
                      : 'border-green-200 bg-green-50 text-green-700 dark:border-green-950 dark:bg-green-950/30 dark:text-green-300',
                )}
              >
                <span>
                  {new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  {overrideReason ? <span className="sr-only"> · {overrideTitle}</span> : markerTitle ? <span className="sr-only"> · {markerTitle}</span> : null}
                </span>
                <span className="flex items-center gap-1">
                  {periodTile ? (effectivelyEnabled ? <Check className="size-3" aria-hidden="true" /> : <CircleOff className="size-3" aria-hidden="true" />) : disabled ? <CircleOff className="size-3" aria-hidden="true" /> : <Check className="size-3" aria-hidden="true" />}
                  {periodTile ? (effectivelyEnabled ? labels.enabled : labels.disabled) : disabled ? labels.disabled : labels.enabled}
                </span>
              </button>
              {renewalFollows && renewalDay ? (
                <div
                  data-virtual-marker="RENEWAL"
                  title={labels.renewal}
                  className={cn('flex w-full items-center justify-between gap-2 rounded border border-dashed px-2 py-1', AMBER_ENABLED_CLASSES)}
                >
                  <span>{new Date(`${renewalDay.date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                  <span>+7 · {labels.renewal}</span>
                </div>
              ) : null}
            </div>
          )
        }

        return (
          <button
            key={date}
            type="button"
            disabled={savingDate === date}
            onClick={() => void toggleDate(date)}
            data-period-first-day={firstDayMarker?.markerId}
            data-override-source={overrideReason ? overrideTitle : undefined}
            style={firstDayMarker ? { boxShadow: `inset 3px 0 0 ${firstDayMarker.color || '#2563eb'}` } : undefined}
            title={overrideReason ? (markerTitle ? `${overrideTitle} · ${markerTitle}` : overrideTitle) : markerTitle}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled ? RED_DISABLED_CLASSES : 'border-green-200 bg-green-50 text-green-700 dark:border-green-950 dark:bg-green-950/30 dark:text-green-300',
            )}
          >
            <span>
              {new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' })}
              {overrideReason ? <span className="sr-only"> · {overrideTitle}</span> : markerTitle ? <span className="sr-only"> · {markerTitle}</span> : null}
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
