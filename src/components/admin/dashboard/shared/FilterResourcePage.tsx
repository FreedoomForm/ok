'use client'

import { Check, CircleOff, KeyRound, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KeyState } from './workspace-state'

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
  keyState?: KeyState
  onToggleKey?: () => void
  closeLabel?: string
  enabledLabel?: string
  disabledLabel?: string
  clearLabel?: string
  saveLabel?: string
}

const control = 'h-14 rounded-lg border px-3 shadow-none transition-colors duration-150 active:scale-[.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function keyTone(keyState: KeyState) {
  if (keyState === 'armed') return 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
  if (keyState === 'active') return 'border-red-600 bg-red-600 text-white hover:bg-red-700'
  return 'border-input bg-card text-primary hover:bg-accent'
}

export function FilterResourcePage({
  label,
  columns,
  enabledColumns,
  onToggleColumn,
  onClear,
  onSave,
  onClose,
  keyState = 'disarmed',
  onToggleKey,
  closeLabel = 'Закрыть',
  enabledLabel = 'Включено',
  disabledLabel = 'Отключено',
  clearLabel = 'Очистить',
  saveLabel = 'Сохранить',
}: FilterResourcePageProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label={label} data-reference-filter-window="true">
      <header className="flex min-h-16 items-center gap-2 border-b border-border/40 px-2 py-1.5 md:px-4">
        {onToggleKey ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Key"
            title="Key"
            aria-pressed={keyState !== 'disarmed'}
            data-reference-filter-key="true"
            onClick={onToggleKey}
            className={cn(control, 'w-14 p-0', keyTone(keyState))}
          >
            <KeyRound className="size-7" strokeWidth={1.8} aria-hidden="true" />
          </Button>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">{label}</h2>
        <Button type="button" variant="ghost" size="icon" aria-label={closeLabel} title={closeLabel} onClick={onClose} className={cn(control, 'w-14 p-0 border-transparent text-muted-foreground hover:bg-accent')}>
          <X className="size-7" strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-border/40" role="listbox" aria-label={label} aria-multiselectable="true">
          {columns.map((column) => {
            const enabled = enabledColumns.has(column.id)
            return (
              <button
                key={column.id}
                type="button"
                role="option"
                aria-selected={enabled}
                data-filter-column={column.id}
                onClick={() => onToggleColumn(column.id)}
                className={cn('flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-sm transition-colors active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', enabled ? 'bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-red-50/50 text-red-800 dark:bg-red-950/20 dark:text-red-300')}
              >
                <span className="min-w-0 truncate">{column.label}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs" data-filter-column-state={enabled ? 'enabled' : 'disabled'}>
                  {enabled ? <Check className="size-4" aria-hidden="true" /> : <CircleOff className="size-4" aria-hidden="true" />}
                  {enabled ? enabledLabel : disabledLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <footer className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border/40 bg-background px-2 py-2 md:px-4">
        <Button type="button" variant="ghost" onClick={onClear} className={cn(control, 'border-transparent text-muted-foreground hover:bg-accent')}>
          {clearLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onSave} className={cn(control, 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}>
          <Save className="mr-1.5 size-[18px]" aria-hidden="true" />
          {saveLabel}
        </Button>
      </footer>
    </section>
  )
}
