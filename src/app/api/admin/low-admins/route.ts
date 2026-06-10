import { createApiRoute } from '@/modules/shared/http'
import { executeListAdmins, executeCreateAdmin } from '@/modules/admins'
import { ConflictError } from '@/modules/shared/errors'
import { Prisma } from '@prisma/client'

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const result = await executeListAdmins({ user, role: 'low', cursor, limit })
    return { data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } }
  },
})

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json()
    try {
      const admin = await executeCreateAdmin({ user, data: body })
      return { data: admin }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Admin with this email already exists')
        }
        if (error.code === 'P2003') {
          throw new ConflictError('Error creating: invalid creator ID')
        }
      }
      throw error
    }
  },
})
