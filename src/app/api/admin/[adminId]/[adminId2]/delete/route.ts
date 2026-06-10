import { createApiRoute } from '@/modules/shared/http'
import { executeDeleteAdmin } from '@/modules/admins'

export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ user, params }) => {
    const adminId2 = params?.adminId2 as string
    const result = await executeDeleteAdmin({ user, adminId: adminId2 })
    return { data: { message: 'Admin successfully deleted', ...result } }
  },
})
