'use client'

import { useCallback } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'

export interface FilterColumn {
    key: string
    label: string
    type: 'number' | 'text'
}

interface TableFilterPanelProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    columns: FilterColumn[]
    filters: Record<string, string>
    onFilterChange: (key: string, value: string) => void
    onClearAll: () => void
    title?: string
}

export function TableFilterPanel({
    open,
    onOpenChange,
    columns,
    filters,
    onFilterChange,
    onClearAll,
    title = 'Filter',
}: TableFilterPanelProps) {
    const activeCount = Object.values(filters).filter((v) => v.trim() !== '').length

    const handleClearAll = useCallback(() => {
        onClearAll()
    }, [onClearAll])

    return (
        <>
            {/* Filter trigger button — rendered outside the Sheet */}
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 relative"
                onClick={() => onOpenChange(true)}
            >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {activeCount > 0 && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {activeCount}
                    </span>
                )}
            </Button>

            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-80 sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            {title}
                        </SheetTitle>
                        <SheetDescription>
                            Filter table rows by column values
                        </SheetDescription>
                    </SheetHeader>

                    <div className="px-4 pb-4 space-y-4 mt-2">
                        {columns.map((col) => (
                            <div key={col.key} className="space-y-1.5">
                                <Label htmlFor={`filter-${col.key}`} className="text-sm font-medium">
                                    {col.label}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id={`filter-${col.key}`}
                                        value={filters[col.key] || ''}
                                        onChange={(e) => onFilterChange(col.key, e.target.value)}
                                        placeholder={
                                            col.type === 'number'
                                                ? 'Filter by number...'
                                                : 'Filter by text...'
                                        }
                                        type={col.type === 'number' ? 'text' : 'text'}
                                        className="pr-8"
                                    />
                                    {filters[col.key] && (
                                        <button
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            onClick={() => onFilterChange(col.key, '')}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 border-t">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleClearAll}
                                disabled={activeCount === 0}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Clear all filters
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}

/**
 * Apply text/number filters to data rows.
 */
export function applyFilters<T extends Record<string, unknown>>(
    data: T[],
    filters: Record<string, string>,
    columns: FilterColumn[]
): T[] {
    const activeFilters = columns.filter(
        (col) => filters[col.key] && filters[col.key].trim() !== ''
    )

    if (activeFilters.length === 0) return data

    return data.filter((row) => {
        return activeFilters.every((col) => {
            const query = filters[col.key].trim().toLowerCase()
            const raw = row[col.key]

            if (col.type === 'number') {
                const num = Number(raw)
                if (!isNaN(num)) {
                    return String(num).includes(query)
                }
                return String(raw ?? '').toLowerCase().includes(query)
            }

            return String(raw ?? '').toLowerCase().includes(query)
        })
    })
}
