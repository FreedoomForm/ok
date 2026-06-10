/**
 * List Courier Orders Query — Application layer.
 *
 * Resolves courier orders with date range filtering.
 */

import type { AuthUser } from '@/lib/auth-utils'
import { ForbiddenError } from '@/modules/shared/errors'
import { listCourierOrders } from '../../infrastructure/courier.repository'
import type { CourierOrderDTO } from '../../contracts'

export interface ListCourierOrdersQuery {
  user: AuthUser
  date?: string | null
  from?: string | null
  to?: string | null
}

/**
 * Execute the List Courier Orders query.
 */
export async function executeListCourierOrders(
  query: ListCourierOrdersQuery,
): Promise<CourierOrderDTO[]> {
  const { user, date, from, to } = query

  if (user.role !== 'COURIER') {
    throw new ForbiddenError('Insufficient permissions')
  }

  let dateFilter: Record<string, unknown> = {}

  if (date) {
    const d = new Date(date)
    const start = new Date(d)
    start.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setHours(23, 59, 59, 999)

    dateFilter = {
      deliveryDate: { gte: start, lte: end },
    }
  } else if (from || to) {
    const deliveryDate: Record<string, Date> = {}

    if (from) {
      const fromDate = new Date(from)
      if (!Number.isNaN(fromDate.getTime())) {
        const start = new Date(fromDate)
        start.setHours(0, 0, 0, 0)
        deliveryDate.gte = start
      }
    }

    if (to) {
      const toDate = new Date(to)
      if (!Number.isNaN(toDate.getTime())) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        deliveryDate.lte = end
      }
    }

    if (Object.keys(deliveryDate).length > 0) {
      dateFilter = { deliveryDate }
    }
  }

  return listCourierOrders(user.id, dateFilter)
}
