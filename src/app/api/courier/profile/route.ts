/**
 * Courier Profile API Route — Migrated to createApiRoute pattern.
 *
 * GET  — Get the courier's profile with salary info
 * PATCH — Update profile (name, email) or change password
 */

import { createApiRoute } from '@/modules/shared/http'
import {
  executeGetCourierProfile,
  executeUpdateProfile,
} from '@/modules/courier'

export const GET = createApiRoute({
  requireAuth: ['COURIER', 'SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user }) => {
    const profile = await executeGetCourierProfile({ user })
    return { data: profile }
  },
})

export const PATCH = createApiRoute({
  requireAuth: ['COURIER'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const result = await executeUpdateProfile({ user, data: body })
    return { data: result }
  },
})
