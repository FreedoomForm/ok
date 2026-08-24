'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { availabilityForDate, normalizeIsoDate, type ResourceAvailabilityOverride, type ResourceState } from '@/lib/resources/availability'

export type ResourceCalendarKind =
  | 'INGREDIENT' | 'SET' | 'GROUP' | 'CLIENT' | 'COURIER' | 'ADMIN' | 'CONTRACT'
  | 'TRANSACTION' | 'VIRTUAL_CARD' | 'DISH' | 'ORDER' | 'PURCHASE' | 'CHAT_CONTACT'

export type ResourceCalendarPanelProps = {
  resourceType: ResourceCalendarKind
  resourceId: string
  days?: number
  compact?: boolean
  forcedState?: ResourceState
}

function localIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ResourceCalendarPanel({ resourceType, resourceId, days = 7, compact = false, forcedState }: ResourceCalendarPanelProps) {
  const { language } = useLanguage()
  const [overrides, setOverrides] = useState<ResourceAvailabilityOverride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingDate, setSavingDate] = useState<string | null>(null)
  const dates = useMemo(() => Array.from({ length: Math.max(1, Math.min(days, 31)) }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index)
    return localIsoDate(date)
  }), [days])
  const dateLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const labels = language === 'ru'
    ? { enabled: 'Включен', disabled: 'Отключен', loading: 'Загрузка', calendar: 'Календарь' }
    : language === 'uz'
      ? { enabled: 'Yoqilgan', disabled: "O'chirilgan", loading: 'Yuklanmoqda', calendar: 'Kalendar' }
      : { enabled: 'Enabled', disabled: 'Disabled', loading: 'Loading', calendar: 'Calendar' }

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

  return (
    <div className={cn('space-y-1.5', compact ? 'text-[11px]' : 'text-xs')}>
      <p className="font-medium text-muted-foreground">{labels.calendar}</p>
      {isLoading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label={labels.loading} /> : dates.map((date) => {
        const state = availabilityForDate(overrides, date)
        const disabled = state === 'DISABLED'
        return (
          <button
            key={date}
            type="button"
            disabled={savingDate === date}
            onClick={() => void toggleDate(date)}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300' : 'border-green-200 bg-green-50 text-green-700 dark:border-green-950 dark:bg-green-950/30 dark:text-green-300',
            )}
          >
            <span>{new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
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
