/**
 * Soft-delete clients — DELETE /api/admin/clients/delete
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeSoftDeleteCustomers } from '@/modules/customers'

export const DELETE = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const { clientIds } = await request.json()

    const result = await executeSoftDeleteCustomers({ user, clientIds })

    return {
      data: {
        message: `Успешно перемещено в корзину: ${result.affectedCount} клиентов. Удалено будущих авто-заказов: ${result.deletedAutoOrders}`,
        ...result,
      },
    }
  },
})
