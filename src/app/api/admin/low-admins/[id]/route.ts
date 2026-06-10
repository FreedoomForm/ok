import { createApiRoute } from '@/modules/shared/http'
import { executeUpdateAdmin, executeDeleteAdmin } from '@/modules/admins'

export const PATCH = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user, params }) => {
    const id = params?.id ?? ''
    const data = await request.json()
    const admin = await executeUpdateAdmin({ user, adminId: id, data })
    return { data: admin }
  },
})

export const DELETE = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, params }) => {
    const id = params?.id ?? ''
    const result = await executeDeleteAdmin({ user, adminId: id })
    return { data: result }
  },
})
