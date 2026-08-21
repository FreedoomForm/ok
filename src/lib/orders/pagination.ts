export const MAX_ORDER_PAGE_SIZE = 500

export type OrderPagination = {
  limit: number
  offset: number
} | null

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function parseOrderPagination(limitValue: string | null, offsetValue: string | null): OrderPagination {
  if (limitValue === null && offsetValue === null) return null

  const requestedLimit = parsePositiveInteger(limitValue, 100)
  const offset = parsePositiveInteger(offsetValue, 0)
  return {
    limit: Math.min(Math.max(requestedLimit, 1), MAX_ORDER_PAGE_SIZE),
    offset,
  }
}
