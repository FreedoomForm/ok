import { ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SecondaryResourceRailItem = {
  id: string
  title: string
  meta: string
  amount?: string
  color?: string
}

export type SecondaryResourceRailProps = {
  ariaLabel: string
  items: readonly SecondaryResourceRailItem[]
  selectedId?: string | null
  expandedId?: string | null
  emptyLabel: string
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  renderExpanded?: (item: SecondaryResourceRailItem) => React.ReactNode
  selectedIds?: readonly string[]
  onSelectionChange?: (ids: readonly string[]) => void
  selectionLabel?: (item: SecondaryResourceRailItem) => string
  resourceKind?: string
}

export function SecondaryResourceRail({
  ariaLabel,
  items,
  selectedId,
  expandedId,
  emptyLabel,
  onSelect,
  onToggle,
  renderExpanded,
  selectedIds = [],
  onSelectionChange,
  selectionLabel,
  resourceKind = 'resource',
}: SecondaryResourceRailProps) {
  return (
    <aside aria-label={ariaLabel} className="flex w-64 shrink-0 flex-col bg-muted/20">
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : items.map((item) => {
          const expanded = expandedId === item.id
          const selected = selectedId === item.id
          return (
            <div key={item.id} data-reference-resource-row={resourceKind} data-resource-id={item.id} className="mb-1 overflow-hidden border border-transparent bg-background">
              <div
                className={cn(
                  'flex min-h-14 items-stretch gap-1',
                  selected && 'ring-2 ring-inset ring-primary',
                )}
                style={item.color ? { backgroundColor: item.color } : undefined}
              >
                {onSelectionChange ? <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  aria-label={selectionLabel?.(item) ?? item.title}
                  onChange={(event) => {
                    const next = event.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id)
                    onSelectionChange(next)
                  }}
                  className="m-2 size-4 shrink-0 self-start"
                /> : null}
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    'min-w-0 flex-1 px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    item.color ? 'text-white' : 'text-foreground',
                  )}
                >
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className={cn('block truncate text-[11px]', item.color ? 'text-white/80' : 'text-muted-foreground')}>
                    {item.meta}
                  </span>
                  {item.amount ? <span className="mt-0.5 block truncate text-xs font-semibold">{item.amount}</span> : null}
                </button>
                <button
                  type="button"
                  aria-label={expanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
                  title={expanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
                  onClick={() => onToggle(item.id)}
                  className={cn('flex w-9 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', item.color ? 'text-white' : 'text-muted-foreground')}
                >
                  {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                </button>
              </div>
              {expanded && renderExpanded ? <div className="border-t border-transparent bg-background p-2">{renderExpanded(item)}</div> : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
