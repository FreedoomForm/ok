import { createApiRoute } from '@/modules/shared/http'
import { executeListUsers } from '@/modules/admins'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    const result = await executeListUsers({ user })
    return { data: result }
  },
})
