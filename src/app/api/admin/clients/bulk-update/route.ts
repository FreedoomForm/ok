/**
 * Bulk update clients — PATCH /api/admin/clients/bulk-update
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeBulkUpdateCustomers } from '@/modules/customers'

export const PATCH = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const { clientIds, updates } = await request.json()

    const result = await executeBulkUpdateCustomers({
      user,
      clientIds,
      updates,
    })

    return {
      data: {
        message: 'Клиенты успешно обновлены',
        ...result,
      },
    }
  },
})
