/**
 * Courier Complete Order API Route — Migrated to createApiRoute pattern.
 *
 * POST — Mark an order as DELIVERED
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeCompleteOrder } from '@/modules/courier'

export const POST = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ user, params }) => {
    const orderId = params?.id
    if (!orderId) {
      throw new Error('Order ID is required')
    }

    const result = await executeCompleteOrder({ user, orderId })
    return { data: result }
  },
})
