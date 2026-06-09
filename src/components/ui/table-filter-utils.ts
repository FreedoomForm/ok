/**
 * Pure filter utilities — no UI imports, no Sheet/Dialog dependency.
 * Extracted from table-filter-panel.tsx to break the circular chunk-initialization
 * issue caused by Sheet (@radix-ui/react-dialog) and Dialog sharing the same radix primitive.
 */

export interface FilterColumn {
    key: string
    label: string
    type: 'number' | 'text'
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
