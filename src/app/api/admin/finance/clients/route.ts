/**
 * Finance Clients API Route — Migrated to createApiRoute pattern.
 *
 * GET — Get finance client summaries (via executeGetFinanceClients query)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetFinanceClients } from '@/modules/finance'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''
    const asOfRaw = searchParams.get('asOf')
    const asOf = asOfRaw ? new Date(asOfRaw) : null
    const hasAsOf = Boolean(asOfRaw) && asOf instanceof Date && !Number.isNaN(asOf.getTime())

    const result = await executeGetFinanceClients({
      user,
      filter,
      search,
      asOf: hasAsOf ? asOf : null,
    })

    return { data: result }
  },
})
