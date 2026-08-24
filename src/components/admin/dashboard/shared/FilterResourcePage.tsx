'use client'

import { Check, CircleOff, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FilterColumn = {
  id: string
  label: string
}

export type FilterResourcePageProps = {
  label: string
  columns: readonly FilterColumn[]
  enabledColumns: ReadonlySet<string>
  onToggleColumn: (id: string) => void
  onClear: () => void
  onSave: () => void
  onClose: () => void
}

export function FilterResourcePage({ label, columns, enabledColumns, onToggleColumn, onClear, onSave, onClose }: FilterResourcePageProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col border border-border bg-background" aria-label={label}>
      <header className="flex items-center gap-2 border-b border-border p-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Close" title="Close" onClick={onClose}><X className="size-4" /></Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-1.5" role="list" aria-label="Filter columns">
          {columns.map((column) => {
            const enabled = enabledColumns.has(column.id)
            return (
              <button
                key={column.id}
                type="button"
                role="listitem"
                aria-pressed={enabled}
                onClick={() => onToggleColumn(column.id)}
                className={cn('flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', enabled ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-950 dark:bg-green-950/30 dark:text-green-300' : 'border-red-300 bg-red-50 text-red-800 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300')}
              >
                <span>{column.label}</span>
                <span className="flex items-center gap-1 text-xs">{enabled ? <Check className="size-3.5" aria-hidden="true" /> : <CircleOff className="size-3.5" aria-hidden="true" />}{enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            )
          })}
        </div>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-border p-3">
        <Button type="button" variant="outline" onClick={onClear}>Clear</Button>
        <Button type="button" onClick={onSave}><Save className="mr-2 size-4" aria-hidden="true" />Save</Button>
      </footer>
    </section>
  )
}
