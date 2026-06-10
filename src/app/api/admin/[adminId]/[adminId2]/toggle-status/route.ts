import { createApiRoute } from '@/modules/shared/http'
import { executeToggleAdminStatus } from '@/modules/admins'

export const PATCH = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ request, user, params }) => {
    const { adminId2 } = params as unknown as { adminId: string; adminId2: string }
    const { isActive } = await request.json()
    const result = await executeToggleAdminStatus({ user, adminId: adminId2, isActive })
    return {
      data: {
        message: `Admin status successfully ${isActive ? 'activated' : 'deactivated'}`,
        ...result,
      },
    }
  },
})
