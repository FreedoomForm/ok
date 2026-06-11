/**
 * Menu Sets API — GET (list, role-scoped) + POST (create from standard MENUS)
 *
 * Thin route wired to the admins module. Role-based scoping and the menu-set
 * seed-building logic now live in the application layer
 * (`executeListMenuSets` / `executeCreateMenuSet`).
 */

import { createApiRoute } from '@/modules/shared/http'
import { executeListMenuSets, executeCreateMenuSet } from '@/modules/admins'

export const GET = createApiRoute({
  handler: async ({ user, request }) => {
    const { searchParams } = new URL(request.url)
    const requestedAdminId = searchParams.get('adminId')

    const sets = await executeListMenuSets({ user, requestedAdminId })
    return { data: sets }
  },
})

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request }) => {
    const body = await request.json()
    const newSet = await executeCreateMenuSet({
      user,
      data: { name: body?.name, description: body?.description },
    })
    return { data: newSet }
  },
})
