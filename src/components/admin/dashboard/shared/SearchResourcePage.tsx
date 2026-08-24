'use client'

import { CalendarDays, Filter, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type SearchResourcePageProps = {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onClose: () => void
  onOpenFilter: () => void
  onOpenCalendar: () => void
}

export function SearchResourcePage({ label, value, placeholder, onChange, onClose, onOpenFilter, onOpenCalendar }: SearchResourcePageProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col border border-border bg-background" aria-label={label}>
      <header className="flex items-center gap-2 border-b border-border p-3">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Close" title="Close" onClick={onClose}><X className="size-4" /></Button>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Input autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onOpenFilter}><Filter className="mr-2 size-4" aria-hidden="true" />Filter</Button>
          <Button type="button" variant="outline" onClick={onOpenCalendar}><CalendarDays className="mr-2 size-4" aria-hidden="true" />Calendar</Button>
        </div>
      </div>
    </section>
  )
}
