/**
 * Admin Couriers API Route — Migrated to createApiRoute pattern.
 *
 * GET   — List all couriers (scoped by admin role)
 * PATCH — Update a courier (name, location, salary)
 * POST  — Create a new courier account
 */

import { createApiRoute } from '@/modules/shared/http'
import {
  executeListAdminCouriers,
  executeAdminUpdateCourier,
  executeAdminCreateCourier,
} from '@/modules/courier'

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListAdminCouriers({ user, cursor, limit })
    return { data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})

export const PATCH = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const courier = await executeAdminUpdateCourier({ user, data: body })
    return { data: courier }
  },
})

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const courier = await executeAdminCreateCourier({ user, data: body })
    return { data: courier }
  },
})
