import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты (ожидается YYYY-MM-DD)'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    const { date } = parsed.data
    const todayISO = new Date().toISOString().split('T')[0]
    if (date !== todayISO) {
      return NextResponse.json({ error: 'Можно начать только заказы за сегодня' }, { status: 400 })
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

    return NextResponse.json({ message: 'OK', updatedCount: result.count })
  } catch (error) {
    console.error('Dispatch start-day error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
