import { createApiRoute } from '@/modules/shared/http'
import { db } from '@/lib/db'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user }) => {
    const todayISO = new Date().toISOString().split('T')[0]
    const endToday = new Date(`${todayISO}T23:59:59.999Z`)

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    const result = await db.order.updateMany({
      where: {
        deletedAt: null,
        deliveryDate: { gt: endToday },
        orderStatus: { in: ['PENDING', 'IN_DELIVERY', 'PAUSED'] },
        ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
      },
      data: { orderStatus: 'NEW' },
    })

    return { data: { message: 'OK', updatedCount: result.count } }
  },
})
