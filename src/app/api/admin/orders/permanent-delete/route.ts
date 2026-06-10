/**
 * Permanently delete orders — DELETE /api/admin/orders/permanent-delete
 */

import { createApiRoute } from '@/modules/shared/http'
import { executePermanentDeleteOrders } from '@/modules/orders'

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }) => {
    const { orderIds } = await request.json()

    const result = await executePermanentDeleteOrders({ user, orderIds })

    return {
      data: {
        message: 'Orders permanently deleted successfully',
        ...result,
      },
    }
  },
})
