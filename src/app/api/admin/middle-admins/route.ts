import { createApiRoute } from '@/modules/shared/http'
import { executeListAdmins, executeCreateMiddleAdmin } from '@/modules/admins'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ user }) => {
    const admins = await executeListAdmins({ user, role: 'middle' })
    return { data: admins }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    const admin = await executeCreateMiddleAdmin({ user, data: body })
    return { data: admin }
  },
})
