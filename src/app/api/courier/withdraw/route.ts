/**
 * Courier Withdraw API Route — Migrated to createApiRoute pattern.
 *
 * POST — Request a salary withdrawal
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeRequestWithdraw } from '@/modules/courier'

export const POST = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeRequestWithdraw({ user, data: body })
    return { data: result }
  },
})
