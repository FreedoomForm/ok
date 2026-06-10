/**
 * Courier Fail Order API Route — Migrated to createApiRoute pattern.
 *
 * POST — Mark an order as FAILED
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeFailOrder } from '@/modules/courier'

export const POST = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ request, user, params }) => {
    const orderId = params?.id
    if (!orderId) {
      throw new Error('Order ID is required')
    }

    const body = await request.json().catch(() => ({}))
    const result = await executeFailOrder({ user, orderId, data: body })
    return { data: result }
  },
})
