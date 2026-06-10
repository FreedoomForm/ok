/**
 * Get Cooking Plan Query — Application layer.
 *
 * Supports both single-date and date-range queries.
 */

import type { AuthUser } from '@/modules/shared/auth'
import {
  getCookingPlanForDate,
  getCookingPlansForRange,
} from '../../infrastructure/warehouse.repository'
import type { CookingPlanDTO, CookingPlanRangeResult } from '../../contracts'

export interface GetCookingPlanQuery {
  user: AuthUser
  date?: string
  from?: string
  to?: string
}

function toLocalDayBounds(input: string) {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Execute the Get Cooking Plan query.
 *
 * - If `date` is provided: returns single-day plan
 * - If `from`/`to` are provided: returns range of plans
 */
export async function executeGetCookingPlan(
  query: GetCookingPlanQuery,
): Promise<CookingPlanDTO | CookingPlanRangeResult> {
  const { date, from, to } = query

  // Backward-compatible single-day fetch
  if (date) {
    const bounds = toLocalDayBounds(date)
    if (!bounds) {
      throw new Error('Invalid date')
    }
    return getCookingPlanForDate(bounds.start, bounds.end)
  }

  // Period/range fetch
  if (!from && !to) {
    throw new Error('Date is required')
  }

  const fromBounds = from ? toLocalDayBounds(from) : null
  const toBounds = to ? toLocalDayBounds(to) : null

  if (from && !fromBounds) throw new Error('Invalid from')
  if (to && !toBounds) throw new Error('Invalid to')

  const start = fromBounds?.start ?? toBounds!.start
  const end = toBounds?.end ?? fromBounds!.end

  return getCookingPlansForRange(start, end)
}
