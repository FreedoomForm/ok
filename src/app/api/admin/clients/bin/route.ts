/**
 * Bin clients — GET /api/admin/clients/bin
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListCustomers } from '@/modules/customers'

export const GET = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user }) => {
    const result = await executeListCustomers({ user, deletedOnly: true })
    return { data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})
