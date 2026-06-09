import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import { getMenuNumber } from '@/lib/menuData'

interface CalendarDateSelectorProps {
  selectedDate: Date | null
  applySelectedDate: (date: Date | null) => void
  shiftSelectedDate?: (days: number) => void
  selectedDateLabel?: string
  locale?: string
  // Period mode (preferred for audits): when provided, the selector becomes a true range picker.
  selectedPeriod?: DateRange | undefined
  applySelectedPeriod?: (range: DateRange | undefined) => void
  /**
   * Legacy UX toggle: when true, show prev/next day buttons next to the calendar trigger.
   * Default false to match the "middle-admin database" calendar UX (period-first, no day shifting row).
   */
  showShiftButtons?: boolean
  profileUiText: {
    calendar: string
    today: string
    clearDate: string
    yesterday: string
    tomorrow: string
    // Optional: if not provided we fall back to English strings.
    thisWeek?: string
    thisMonth?: string
    allTime?: string
  }
}

function toLocalIsoDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function CalendarDateSelector({
  selectedDate,
  applySelectedDate,
  shiftSelectedDate,
  selectedDateLabel,
  locale = 'en-US',
  showShiftButtons = false,
  selectedPeriod,
  applySelectedPeriod,
  profileUiText,
}: CalendarDateSelectorProps) {
  const isPeriodMode = typeof applySelectedPeriod === 'function'
  const value: DateRange | undefined = isPeriodMode
    ? selectedPeriod
    : selectedDate
      ? { from: selectedDate, to: selectedDate }
      : undefined

  const menuChip = (() => {
    if (!value?.from) return 'Menu'
    const fromNum = getMenuNumber(value.from)
    const toNum = getMenuNumber(value.to ?? value.from)
    return fromNum === toNum ? `Menu ${fromNum}` : `Menu ${fromNum}-${toNum}`
  })()

  return (
    <div className="flex min-w-0 items-center gap-2">
      {showShiftButtons && shiftSelectedDate ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => shiftSelectedDate(-1)}
            title={profileUiText.yesterday}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => shiftSelectedDate(1)}
            title={profileUiText.tomorrow}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      <CalendarRangeSelector
        value={value}
        onChange={(nextRange) => {
          if (isPeriodMode) {
            applySelectedPeriod(nextRange)
            return
          }

          if (!nextRange?.from) {
            applySelectedDate(null)
            return
          }

          const normalized = new Date(nextRange.from)
          normalized.setHours(0, 0, 0, 0)
          applySelectedDate(normalized)
        }}
        uiText={{
          calendar: menuChip,
          today: profileUiText.today,
          thisWeek: profileUiText.thisWeek ?? 'This week',
          thisMonth: profileUiText.thisMonth ?? 'This month',
          clearRange: profileUiText.clearDate,
          allTime: profileUiText.allTime ?? selectedDateLabel ?? 'All time',
        }}
        locale={locale}
        className="min-w-0 w-[240px] max-w-full"
      />

      {/* Keep the selected label in the DOM for quick QA/debug in case locale formatting differs. */}
      <span className="sr-only">{selectedDate ? toLocalIsoDate(selectedDate) : selectedDateLabel ?? ''}</span>
    </div>
  )
}
