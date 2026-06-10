/**
 * Reorder orders — POST /api/admin/orders/reorder
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeReorderOrders } from '@/modules/orders'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { updates } = await request.json()

    const result = await executeReorderOrders({ user, updates })

    return {
      data: {
        message: 'OK',
        ...result,
      },
    }
  },
})
