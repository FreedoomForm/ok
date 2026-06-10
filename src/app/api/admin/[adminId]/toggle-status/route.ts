import { createApiRoute } from '@/modules/shared/http'
import { executeToggleAdminStatus } from '@/modules/admins'

export const PATCH = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user, params }) => {
    const adminId = params?.adminId ?? ''
    const { isActive } = await request.json()
    const result = await executeToggleAdminStatus({ user, adminId, isActive })
    return { data: result }
  },
})
