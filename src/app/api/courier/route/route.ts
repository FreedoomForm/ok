/**
 * Courier Route API Route — Migrated to createApiRoute pattern.
 *
 * GET — Get today's route (non-failed orders) for the courier
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetCourierRoute } from '@/modules/courier'

export const GET = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId') ?? undefined

    const orders = await executeGetCourierRoute({ user, orderId })
    return { data: orders }
  },
})
