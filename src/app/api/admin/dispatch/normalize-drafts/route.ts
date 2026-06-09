import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

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

    return NextResponse.json({ message: 'OK', updatedCount: result.count })
  } catch (error) {
    console.error('Dispatch normalize-drafts error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

