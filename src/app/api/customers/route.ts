/**
 * GET /api/customers — List customers (admin-facing).
 *
 * Thin route wired to the customers module. Previously this did an UNBOUNDED,
 * UNSCOPED `db.customer.findMany({ where: { isActive: true } })`, which (a)
 * returned every customer across all admin groups (cross-tenant leak) and (b)
 * had no pagination (DB DS: "list endpoint without pagination is a bug").
 *
 * `executeListCustomers` enforces role-based scoping and cursor pagination.
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListCustomers } from '@/modules/customers'

export const GET = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined

    const result = await executeListCustomers({ user, cursor, limit })

    return {
      data: result.items,
      meta: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    }
  },
})
