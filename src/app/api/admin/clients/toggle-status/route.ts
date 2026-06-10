/**
 * Toggle client status — PATCH /api/admin/clients/toggle-status
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeToggleCustomerStatus } from '@/modules/customers'

export const PATCH = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const clientIds = Array.isArray(body.clientIds) ? body.clientIds : []
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : null

    const result = await executeToggleCustomerStatus({
      user,
      clientIds,
      isActive: isActive as boolean,
    })

    return {
      data: {
        message: `Статус ${isActive ? 'возобновлен' : 'приостановлен'} для ${result.affectedCount} клиентов`,
        ...result,
      },
    }
  },
})
