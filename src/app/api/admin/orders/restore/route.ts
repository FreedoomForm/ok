/**
 * Restore orders from bin — POST /api/admin/orders/restore
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeRestoreOrders } from '@/modules/orders'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { orderIds } = await request.json()

    const result = await executeRestoreOrders({ user, orderIds })

    return {
      data: {
        message: 'Заказы успешно восстановлены',
        ...result,
      },
    }
  },
})
