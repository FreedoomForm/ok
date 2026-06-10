/**
 * Warehouse API Route — Migrated to createApiRoute pattern.
 *
 * GET  — Get warehouse point (admin geolocation)
 * PATCH — Update warehouse point (direct coords or Google Maps link)
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeGetWarehouse, executeUpdateWarehouse } from '@/modules/warehouse'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user }) => {
    const result = await executeGetWarehouse({ user })
    return { data: result }
  },
})

export const PATCH = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeUpdateWarehouse({ user, data: body })
    return { data: result }
  },
})
