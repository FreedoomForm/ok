/**
 * Courier Orders API Route — Migrated to createApiRoute pattern.
 *
 * GET — List courier orders with date range filtering
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListCourierOrders } from '@/modules/courier'

export const GET = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const orders = await executeListCourierOrders({ user, date, from, to })
    return { data: orders }
  },
})
