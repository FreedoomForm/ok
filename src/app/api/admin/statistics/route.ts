/**
 * Order Statistics API — GET
 *
 * Migrated to use `createApiRoute` + orders module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetOrderStats } from '@/modules/orders'

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user }) => {
    const stats = await executeGetOrderStats({ user })
    return { data: stats }
  },
})
