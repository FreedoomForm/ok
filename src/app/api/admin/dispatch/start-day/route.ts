import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import { z } from 'zod'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user, request }) => {
    const raw = await request.json()
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid payload')
    }

    const { date } = parsed.data
    const todayISO = new Date().toISOString().split('T')[0]
    if (date !== todayISO) {
      throw new BadRequestError('Can only start orders for today')
    }

    const start = new Date(`${date}T00:00:00.000Z`)
    const end = new Date(`${date}T23:59:59.999Z`)

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    const result = await db.order.updateMany({
      where: {
        deletedAt: null,
        courierId: { not: null },
        deliveryDate: { gte: start, lte: end },
        orderStatus: { in: ['NEW', 'IN_PROCESS'] },
        ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
      },
      data: { orderStatus: 'PENDING' },
    })

    return { data: { message: 'OK', updatedCount: result.count } }
  },
})
