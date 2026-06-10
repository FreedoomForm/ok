/**
 * Bulk update orders — PATCH /api/admin/orders/bulk-update
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeBulkUpdateOrders } from '@/modules/orders'

export const PATCH = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { orderIds, updates } = await request.json()

    const result = await executeBulkUpdateOrders({ user, orderIds, updates })

    return {
      data: {
        message: 'Заказы успешно обновлены',
        ...result,
      },
    }
  },
})
