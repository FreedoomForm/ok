/**
 * GET /api/admin/views/dashboard — BFF aggregation endpoint.
 *
 * Returns multiple dashboard data sections in a single response,
 * reducing the frontend's initial load from 5–8 separate API calls to one.
 *
 * Query params:
 *   sections  — comma-separated list of sections to include
 *               (overview, stats, orders, clients, couriers, sets)
 *               Default: all sections.
 *   from      — ISO date (YYYY-MM-DD) for order date-range start
 *   to        — ISO date (YYYY-MM-DD) for order date-range end
 *   filters   — JSON-encoded OrderListFilters for order filtering
 */

import { createApiRoute } from '@/modules/shared/http'
import type { OrderListFilters } from '@/modules/orders'
import {
  executeDashboardView,
  parseSections,
  type DashboardViewData,
} from '@/views/dashboard.view'

export const GET = createApiRoute<DashboardViewData>({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)

    // ── Parse query params ──
    const sections = parseSections(searchParams.get('sections'))
    const orderFrom = searchParams.get('from')
    const orderTo = searchParams.get('to')

    let orderFilters: OrderListFilters | null = null
    const filtersParam = searchParams.get('filters')
    if (filtersParam) {
      try {
        orderFilters = JSON.parse(filtersParam)
      } catch {
        // Invalid filter JSON — ignore
      }
    }

    // ── Execute the aggregated view ──
    const data = await executeDashboardView({
      user,
      sections,
      orderFrom,
      orderTo,
      orderFilters,
    })

    return { data }
  },
})
