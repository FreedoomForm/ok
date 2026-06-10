/**
 * Order Timeline API — GET
 *
 * Migrated to use `createApiRoute` + orders module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetOrderTimeline } from '@/modules/orders'
import { BadRequestError } from '@/modules/shared/errors'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user, params }) => {
    const orderId = params?.orderId
    if (!orderId) {
      throw new BadRequestError('Order ID is required')
    }

    const result = await executeGetOrderTimeline({ user, orderId })
    return { data: result }
  },
})
