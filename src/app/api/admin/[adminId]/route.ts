import { createApiRoute } from '@/modules/shared/http'
import { executeUpdateMiddleAdmin, executeDeleteAdmin } from '@/modules/admins'

export const PATCH = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ request, user, params }) => {
    const adminId = params?.adminId as string
    const body = await request.json()
    const admin = await executeUpdateMiddleAdmin({ user, adminId, data: body })
    return { data: admin }
  },
})

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ user, params }) => {
    const adminId = params?.adminId as string
    const result = await executeDeleteAdmin({ user, adminId })
    return { data: result }
  },
})
