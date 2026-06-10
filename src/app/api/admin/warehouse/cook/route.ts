/**
 * Warehouse Cook API Route — Migrated to createApiRoute pattern.
 *
 * POST — Execute cooking plan (deduct ingredients from warehouse)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeCook } from '@/modules/warehouse'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeCook({ user, data: body })
    return { data: result }
  },
})
