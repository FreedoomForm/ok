/**
 * Soft-delete orders — DELETE /api/admin/orders/delete
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeSoftDeleteOrders } from '@/modules/orders'

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { orderIds } = await request.json()

    const result = await executeSoftDeleteOrders({ user, orderIds })

    return {
      data: {
        message: 'Orders moved to bin successfully',
        ...result,
      },
    }
  },
})
