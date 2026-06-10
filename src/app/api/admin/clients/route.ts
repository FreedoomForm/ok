/**
 * Clients API — GET (list) + POST (create)
 *
 * Both endpoints use `createApiRoute` + customers module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListCustomers, executeCreateCustomer } from '@/modules/customers'

// ── GET /api/admin/clients — List customers ──────────────────────────────────

export const GET = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListCustomers({ user, cursor, limit })
    return { data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})

// ── POST /api/admin/clients — Create customer ───────────────────────────────

export const POST = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()

    const client = await executeCreateCustomer({
      user,
      data: body,
    })

    return { data: client, message: 'Клиент успешно создан' }
  },
})
