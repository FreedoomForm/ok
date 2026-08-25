'use client'

import { CalendarDays, Filter, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type SearchResourcePageProps = {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onClose: () => void
  onOpenFilter: () => void
  onOpenCalendar: () => void
  closeLabel?: string
  filterLabel?: string
  calendarLabel?: string
}

const auxiliaryControl = 'h-11 rounded-lg border px-3 shadow-none transition-colors duration-150 active:scale-[.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function SearchResourcePage({
  label,
  value,
  placeholder,
  onChange,
  onClose,
  onOpenFilter,
  onOpenCalendar,
  closeLabel = 'Закрыть',
  filterLabel = 'Фильтр',
  calendarLabel = 'Календарь',
}: SearchResourcePageProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label={label} data-reference-search-window="true">
      <header className="flex min-h-16 items-center gap-2 border-b border-border/40 px-2 py-1.5 md:px-4">
        <Search className="ml-2 size-6 text-primary" strokeWidth={1.8} aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">{label}</h2>
        <Button type="button" variant="ghost" size="icon" aria-label={closeLabel} title={closeLabel} onClick={onClose} className={cn(auxiliaryControl, 'w-14 p-0 border-transparent text-muted-foreground hover:bg-accent')}><X className="size-7" strokeWidth={1.8} /></Button>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Input autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-11 rounded-lg border-border/60 shadow-none" />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="ghost" onClick={onOpenFilter} className={cn(auxiliaryControl, 'border-input hover:bg-accent')}><Filter className="mr-2 size-[18px]" aria-hidden="true" />{filterLabel}</Button>
          <Button type="button" variant="ghost" onClick={onOpenCalendar} className={cn(auxiliaryControl, 'border-input hover:bg-accent')}><CalendarDays className="mr-2 size-[18px]" aria-hidden="true" />{calendarLabel}</Button>
        </div>
      </div>
    </section>
  )
}
