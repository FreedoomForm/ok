/**
 * Courier Stats API Route — Migrated to createApiRoute pattern.
 *
 * GET — Get delivery statistics for the courier
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetCourierStats } from '@/modules/courier'

export const GET = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ user }) => {
    const stats = await executeGetCourierStats({ user })
    return { data: stats }
  },
})
