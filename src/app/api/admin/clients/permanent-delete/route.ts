/**
 * Permanently delete clients — DELETE /api/admin/clients/permanent-delete
 */

import { createApiRoute } from '@/modules/shared/http'
import { executePermanentDeleteCustomers } from '@/modules/customers'

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }) => {
    const { clientIds } = await request.json()

    const result = await executePermanentDeleteCustomers({ user, clientIds })

    return {
      data: {
        message: `Успешно удалено навсегда: ${result.deletedClients} клиентов и ${result.deletedOrders} заказов`,
        ...result,
      },
    }
  },
})
