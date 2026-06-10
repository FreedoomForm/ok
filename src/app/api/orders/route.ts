/**
 * Orders API — GET (list) + POST (create)
 *
 * Both endpoints use `createApiRoute` + orders module Clean Architecture.
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListOrders, executeCreateOrder } from '@/modules/orders'
import type { OrderListFilters } from '@/modules/orders'

// ── GET /api/orders — List orders ────────────────────────────────────────────

export const GET = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const filtersParam = searchParams.get('filters')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const deletedOnly = searchParams.get('deletedOnly') === 'true'

    let filters: OrderListFilters | null = null
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
      } catch {
        // Invalid filter JSON — ignore filters
      }
    }

    const orders = await executeListOrders({
      user,
      date,
      from,
      to,
      filters,
      includeDeleted,
      deletedOnly,
    })

    return { data: orders }
  },
})

// ── POST /api/orders — Create order ─────────────────────────────────────────

export const POST = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'],
  handler: async ({ request, user }) => {
    const body = await request.json()

    const order = await executeCreateOrder({
      user,
      data: body,
    })

    return { data: order, message: 'Заказ успешно создан' }
  },
})
