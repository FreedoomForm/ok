import { createApiRoute } from '@/modules/shared/http'
import { db } from '@/lib/db'
import { getGroupAdminIds } from '@/lib/admin-scope'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    let where: any = {}

    if (user.role === 'SUPER_ADMIN') {
      where = {}
    } else {
      const groupAdminIds = await getGroupAdminIds(user)
      const allowedIds = groupAdminIds ?? [user.id]
      where = { id: { in: allowedIds } }
    }

    const users = await db.admin.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })

    return { data: { users } }
  },
})
