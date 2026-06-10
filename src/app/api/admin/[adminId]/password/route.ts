import { createApiRoute } from '@/modules/shared/http'
import { executeResetPassword } from '@/modules/admins'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ user, params }) => {
    const adminId = params?.adminId ?? ''
    const result = await executeResetPassword({ user, adminId })
    return { data: result }
  },
})
