import { createApiRoute } from '@/modules/shared/http'
import { executeListAdmins, executeCreateMiddleAdmin } from '@/modules/admins'

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListAdmins({ user, role: 'middle', cursor, limit })
    return { data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
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
