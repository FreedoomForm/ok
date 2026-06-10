/**
 * Courier Next Order API Route — Migrated to createApiRoute pattern.
 *
 * GET — Get the next active order for the courier
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetNextOrder } from '@/modules/courier'

export const GET = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ user }) => {
    const order = await executeGetNextOrder({ user })
    return { data: order }
  },
})
