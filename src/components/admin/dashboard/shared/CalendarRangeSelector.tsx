'use client'

import { CalendarDays } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Dynamic-import Calendar to keep react-day-picker + date-fns out of the main admin chunk.
// This prevents the TDZ ReferenceError caused by @radix-ui/react-dialog being shared
// between static (Dialog) and dynamic (Sheet) import paths.
const Calendar = dynamic(
  () => import('@/components/ui/calendar').then((mod) => mod.Calendar),
  { ssr: false }
)

type CalendarRangeSelectorUiText = {
  calendar: string
  today: string
  thisWeek: string
  thisMonth: string
  clearRange: string
  allTime: string
}

function toIsoDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfWeekMonday(base: Date) {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0..6, Sun..Sat
  const diff = (day + 6) % 7 // Monday=0
  d.setDate(d.getDate() - diff)
  return d
}

function endOfWeekSunday(base: Date) {
  const start = startOfWeekMonday(base)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function startOfMonth(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfMonth(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

function formatRangeLabel(value: DateRange | undefined, locale: string, allTimeLabel: string) {
  if (!value?.from) return allTimeLabel
  const from = value.from
  const to = value.to ?? value.from
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
  const fromLabel = from.toLocaleDateString(locale, opts)
  const toLabel = to.toLocaleDateString(locale, opts)
  return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`
}

export function CalendarRangeSelector({
  value,
  onChange,
  uiText,
  locale = 'en-US',
  className,
  highlightAfterRange = false,
}: {
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
  uiText: CalendarRangeSelectorUiText
  locale?: string
  className?: string
  highlightAfterRange?: boolean
}) {
  const label = formatRangeLabel(value, locale, uiText.allTime)
  const hasRange = Boolean(value?.from)
  const rangeEnd = value?.to ?? value?.from
  const afterRangeModifier =
    highlightAfterRange && rangeEnd
      ? (day: Date) => {
          const d = new Date(day)
          const end = new Date(rangeEnd)
          d.setHours(0, 0, 0, 0)
          end.setHours(0, 0, 0, 0)
          return d.getTime() > end.getTime()
        }
      : undefined

  const applyToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    onChange({ from: today, to: today })
  }

  const applyWeek = () => {
    const today = new Date()
    const from = startOfWeekMonday(today)
    const to = endOfWeekSunday(today)
    onChange({ from, to })
  }

  const applyMonth = () => {
    const today = new Date()
    const from = startOfMonth(today)
    const to = endOfMonth(today)
    onChange({ from, to })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
 className={['h-9 min-w-0 w-[240px] max-w-full justify-between gap-2 px-3 text-left', className].filter(Boolean).join('')}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">{label}</span>
          </span>
          <span className="max-w-[110px] truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {uiText.calendar}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          selected={value}
          onSelect={onChange}
          defaultMonth={value?.from}
          numberOfMonths={typeof window !== 'undefined' && window.innerWidth >= 768 ? 2 : 1}
          modifiers={{
            ...(afterRangeModifier ? { after_selected_period: afterRangeModifier } : {}),
          }}
          modifiersClassNames={{
            ...(afterRangeModifier ? { after_selected_period: 'bg-neutral-200/40 text-main-foreground' } : {}),
          }}
        />
 <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={applyToday}>
              {uiText.today}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={applyWeek}>
              {uiText.thisWeek}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={applyMonth}>
              {uiText.thisMonth}
            </Button>
          </div>
          {hasRange ? (
            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => onChange(undefined)}>
              {uiText.clearRange}
            </Button>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{toIsoDate(new Date())}</span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
