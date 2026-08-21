import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { parseStartDayDate } from '@/lib/admin/start-day'

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

    const parsed = parseStartDayDate(raw)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { start, end } = parsed

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
