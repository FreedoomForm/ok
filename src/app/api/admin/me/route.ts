import { createApiRoute } from '@/modules/shared/http'
import { executeGetCurrentAdmin } from '@/modules/admins'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    const admin = await executeGetCurrentAdmin({ userId: user.id })
    return { data: admin }
  },
})
