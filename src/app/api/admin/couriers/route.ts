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
  handler: async ({ user }) => {
    const couriers = await executeListAdminCouriers({ user })
    return { data: couriers }
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
