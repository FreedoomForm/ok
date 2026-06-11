'use client'

import { useMemo } from 'react'

/**
 * Universal search hook that supports:
 *
 * 1. Multi-query: "coffe, google" → show rows matching "coffe" OR "google"
 * 2. Range: "0.5-0.6" → show rows where any numeric column value is between 0.5 and 0.6
 * 3. Combined: "guruch-0.5-0.6" → show rows where "guruch" text is found AND
 *    some numeric value is in the range [0.5, 0.6]
 * 4. Plain text: "rice" → simple includes match across all columns
 *
 * The hook searches ALL columns of every row object.
 */

interface RangeQuery {
  min: number
  max: number
}

interface ParsedQuery {
  /** Text tokens that must all be found in the row (AND logic) */
  textTokens: string[]
  /** Range constraint — at least one numeric value in the row must fall within */
  range: RangeQuery | null
}

function parseNumber(s: string): number | null {
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse a single query segment (between commas).
 *
 * Examples:
 *   "coffe"        → { textTokens: ["coffe"], range: null }
 *   "0.5-0.6"      → { textTokens: [], range: { min: 0.5, max: 0.6 } }
 *   "guruch-0.5-0.6" → { textTokens: ["guruch"], range: { min: 0.5, max: 0.6 } }
 *   "rice-2-5"     → { textTokens: ["rice"], range: { min: 2, max: 5 } }
 */
function parseSegment(segment: string): ParsedQuery {
  const trimmed = segment.trim()
  if (!trimmed) return { textTokens: [], range: null }

  const parts = trimmed.split('-')

  // Try to find a numeric range in the parts.
  // Strategy: find the last two consecutive parts that are both numbers
  // If found, everything before them is the text token.
  let rangeIndex = -1
  for (let i = parts.length - 2; i >= 0; i--) {
    const a = parseNumber(parts[i])
    const b = parseNumber(parts[i + 1])
    if (a !== null && b !== null) {
      rangeIndex = i
      break
    }
  }

  if (rangeIndex >= 0) {
    const range: RangeQuery = {
      min: Math.min(Number(parts[rangeIndex]), Number(parts[rangeIndex + 1])),
      max: Math.max(Number(parts[rangeIndex]), Number(parts[rangeIndex + 1])),
    }
    const textParts = parts.slice(0, rangeIndex)
    const textToken = textParts.join('-').trim()
    return {
      textTokens: textToken ? [textToken.toLowerCase()] : [],
      range,
    }
  }

  // No range found — treat the whole thing as text
  return { textTokens: [trimmed.toLowerCase()], range: null }
}

/**
 * Check if a row matches a single parsed query.
 * A row matches when:
 *   - ALL text tokens are found somewhere in the row's string values (AND)
 *   - AND at least one numeric value in the row falls within the range (if range exists)
 */
function rowMatchesQuery(
  row: Record<string, unknown>,
  query: ParsedQuery
): boolean {
  // Check text tokens — ALL must be found
  if (query.textTokens.length > 0) {
    const allText = Object.values(row)
      .map((v) => String(v ?? ''))
      .join(' ')
      .toLowerCase()

    const allTextsMatch = query.textTokens.every((token) =>
      allText.includes(token)
    )
    if (!allTextsMatch) return false
  }

  // Check range — at least one numeric value must be in range
  if (query.range) {
    const hasMatchingNumber = Object.values(row).some((v) => {
      if (v === null || v === undefined) return false
      const n = typeof v === 'number' ? v : parseNumber(String(v))
      if (n === null) return false
      return n >= query.range!.min && n <= query.range!.max
    })
    if (!hasMatchingNumber) return false
  }

  return true
}

/**
 * Universal search hook.
 *
 * @param items - Array of row objects to search through
 * @param searchTerm - Raw search string from the input (supports comma-separated queries)
 * @param options - Optional: specify which keys to search (default: all keys)
 *
 * @returns Filtered array of items matching the search criteria
 */
export function useUniversalSearch<T extends Record<string, unknown>>(
  items: T[],
  searchTerm: string,
  options?: {
    /** If provided, only search these keys. Default: search all keys. */
    searchKeys?: (keyof T)[]
  }
): T[] {
  return useMemo(() => {
    const query = searchTerm.trim()
    if (!query) return items

    // Split by comma for OR logic between segments
    const segments = query.split(',').filter((s) => s.trim().length > 0)

    if (segments.length === 0) return items

    const parsedQueries = segments.map(parseSegment)

    // If all parsed queries are empty, return all items
    if (parsedQueries.every((q) => q.textTokens.length === 0 && !q.range)) {
      return items
    }

    return items.filter((item) => {
      // If searchKeys is provided, create a filtered view; otherwise use the full object
      const rowToSearch: Record<string, unknown> =
        options?.searchKeys
          ? Object.fromEntries(
              options.searchKeys.map((k) => [k, item[k]])
            )
          : (item as Record<string, unknown>)

      // OR logic: row matches if it matches ANY of the comma-separated queries
      return parsedQueries.some((parsed) =>
        rowMatchesQuery(rowToSearch, parsed)
      )
    })
  }, [items, searchTerm, options?.searchKeys])
}

/**
 * Export the parser for testing / custom usage
 */
export { parseSegment, type ParsedQuery, type RangeQuery }
