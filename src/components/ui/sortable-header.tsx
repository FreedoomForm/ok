'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortState = 'asc' | 'desc' | 'default'

export interface SortableColumn {
    key: string
    label: string
    type: 'number' | 'text'
}

interface SortableTableHeaderProps {
    column: SortableColumn
    sortState: SortState
    onSortChange: (key: string, state: SortState) => void
    className?: string
}

const NEXT_STATE: Record<SortState, SortState> = {
    default: 'asc',
    asc: 'desc',
    desc: 'default',
}

export function SortableTableHeader({
    column,
    sortState,
    onSortChange,
    className,
}: SortableTableHeaderProps) {
    const handleClick = () => {
        onSortChange(column.key, NEXT_STATE[sortState])
    }

    return (
        <TableHead
            className={cn(
                'cursor-pointer select-none hover:bg-blue-50/60 transition-colors',
                className
            )}
            onClick={handleClick}
        >
            <div className="flex items-center gap-1">
                <span>{column.label}</span>
                {sortState === 'asc' && (
                    <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                )}
                {sortState === 'desc' && (
                    <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                )}
                {sortState === 'default' && (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-300">
                        ⇅
                    </span>
                )}
            </div>
        </TableHead>
    )
}

/**
 * Sort data rows based on active sort states.
 * Supports multiple sort keys applied in order.
 */
export function sortData<T extends Record<string, unknown>>(
    data: T[],
    sortStates: Record<string, SortState>,
    columns: SortableColumn[]
): T[] {
    const activeSorts = columns.filter(
        (col) => sortStates[col.key] && sortStates[col.key] !== 'default'
    )

    if (activeSorts.length === 0) return data

    return [...data].sort((a, b) => {
        for (const col of activeSorts) {
            const state = sortStates[col.key]
            if (!state || state === 'default') continue

            const aVal = a[col.key]
            const bVal = b[col.key]

            let cmp = 0

            if (col.type === 'number') {
                const aNum = Number(aVal) || 0
                const bNum = Number(bVal) || 0
                cmp = aNum - bNum
            } else {
                const aStr = String(aVal ?? '').toLowerCase()
                const bStr = String(bVal ?? '').toLowerCase()
                cmp = aStr.localeCompare(bStr)
            }

            if (cmp !== 0) {
                return state === 'desc' ? -cmp : cmp
            }
        }
        return 0
    })
}
