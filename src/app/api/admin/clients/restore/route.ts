/**
 * Restore clients from bin — POST /api/admin/clients/restore
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeRestoreCustomers } from '@/modules/customers'

export const POST = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const { clientIds } = await request.json()

    const result = await executeRestoreCustomers({ user, clientIds })

    return {
      data: {
        message: `Успешно восстановлено: ${result.affectedCount} клиентов`,
        ...result,
      },
    }
  },
})
