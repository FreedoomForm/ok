'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Re-export types and pure utilities from the utils module
// so existing imports like `import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-panel'`
// continue to work without changes.
export { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

/**
 * IMPORTANT: This component intentionally does NOT use Sheet (@radix-ui/react-dialog)
 * to avoid the TDZ ReferenceError caused by @radix-ui/react-dialog being shared
 * between static imports (Dialog/AlertDialog) and dynamic imports (Sheet).
 *
 * Instead, it uses a pure CSS-based slide panel with a backdrop overlay.
 */

interface TableFilterPanelProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    columns: import('@/components/ui/table-filter-utils').FilterColumn[]
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
    const panelRef = useRef<HTMLDivElement>(null)

    const handleClearAll = useCallback(() => {
        onClearAll()
    }, [onClearAll])

    // Close on Escape key
    useEffect(() => {
        if (!open) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false)
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            const original = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = original }
        }
    }, [open])

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 relative"
                onClick={() => onOpenChange(true)}
            >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {activeCount > 0 && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-white">
                        {activeCount}
                    </span>
                )}
            </Button>

            {open && (
                <>
                    {/* Backdrop overlay */}
                    <div
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                        onClick={() => onOpenChange(false)}
                    />

                    {/* Slide panel from right */}
                    <div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className="fixed inset-y-0 right-0 z-50 flex flex-col gap-4 bg-background border-l shadow-lg w-80 sm:max-w-md overflow-y-auto animate-in slide-in-from-right duration-300 ease-in-out"
                    >
                        {/* Header */}
                        <div className="flex flex-col gap-1.5 p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <Filter className="w-4 h-4" />
                                    {title}
                                </div>
                                <button
                                    className="rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-muted transition-opacity"
                                    onClick={() => onOpenChange(false)}
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Filter table rows by column values
                            </p>
                        </div>

                        {/* Filter inputs */}
                        <div className="px-4 pb-4 space-y-4">
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
                                            type="text"
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
                    </div>
                </>
            )}
        </>
    )
}
