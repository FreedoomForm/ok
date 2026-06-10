/**
 * Finance Company API Route — Migrated to createApiRoute pattern.
 *
 * GET — Get company balance and transaction history (via executeGetCompanyBalance query)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetCompanyBalance } from '@/modules/finance'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') as 'company' | 'all' | 'client' | null
    const category = searchParams.get('category') ?? undefined

    const result = await executeGetCompanyBalance({
      user,
      filters: {
        type: type ?? 'all',
        category,
        limit,
      },
    })

    return { data: result }
  },
})
