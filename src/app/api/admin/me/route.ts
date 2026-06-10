import { createApiRoute } from '@/modules/shared/http'
import { NotFoundError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { safeJsonParse } from '@/lib/safe-json'

export const GET = createApiRoute({
  handler: async ({ user }) => {
    const admin = await db.admin.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdBy: true,
        allowedTabs: true,
      },
    })

    if (!admin) {
      throw new NotFoundError('User', user.id)
    }

    const allowedTabs =
      admin.allowedTabs == null
        ? null
        : (() => {
            const parsedAllowedTabs = safeJsonParse<unknown>(admin.allowedTabs, [])
            return Array.isArray(parsedAllowedTabs)
              ? parsedAllowedTabs.filter((t): t is string => typeof t === 'string')
              : []
          })()

    return {
      data: {
        ...admin,
        allowedTabs,
      },
    }
  },
})
