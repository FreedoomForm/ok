/**
 * Get Order Timeline Query — Application layer.
 *
 * Verifies the user has access to the order, then delegates
 * to the repository for audit event retrieval.
 */

import { getGroupAdminIds } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import {
  getOrderTimeline,
  type GetOrderTimelineInput,
} from '../../infrastructure/order.repository'
import type { OrderTimelineEvent } from '../../contracts'
import { NotFoundError } from '@/modules/shared/errors'

export interface GetOrderTimelineQuery {
  user: AuthUser
  orderId: string
  limit?: number
}

export interface OrderTimelineResult {
  orderId: string
  events: OrderTimelineEvent[]
}

/**
 * Execute the Get Order Timeline query.
 *
 * The repository handles access scoping internally, so we just
 * resolve the scoped admin IDs and delegate.
 */
export async function executeGetOrderTimeline(
  query: GetOrderTimelineQuery,
): Promise<OrderTimelineResult> {
  const { user, orderId, limit } = query

  let scopedAdminIds: string[] | null = null
  if (user.role !== 'SUPER_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    if (groupAdminIds && groupAdminIds.length > 0) {
      scopedAdminIds = groupAdminIds
    } else {
      scopedAdminIds = [user.id]
    }
  }

  const input: GetOrderTimelineInput = { orderId, scopedAdminIds, limit }
  const result = await getOrderTimeline(input)

  if (!result) {
    throw new NotFoundError('Order', orderId)
  }

  return result
}
