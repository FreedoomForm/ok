import { createApiRoute } from '@/modules/shared/http'
import { executeUpdateProfile } from '@/modules/admins'

export const PATCH = createApiRoute({
  handler: async ({ user, request }) => {
    const body = await request.json()
    const result = await executeUpdateProfile({ user, data: body })
    return { data: result }
  },
})
