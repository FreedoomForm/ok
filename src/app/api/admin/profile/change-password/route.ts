import { createApiRoute } from '@/modules/shared/http'
import { executeChangePassword } from '@/modules/admins'

export const POST = createApiRoute({
  handler: async ({ user, request }) => {
    const body = await request.json()
    const result = await executeChangePassword({ user, data: body })
    return { data: result }
  },
})
