import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { orderId } = await context.params
    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
      },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    const events = await db.orderAuditEvent.findMany({
      where: { orderId },
      include: {
        actorAdmin: { select: { id: true, name: true, role: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 120,
    })

    return NextResponse.json({
      orderId,
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        actorRole: event.actorRole,
        actorName: event.actorName || event.actorAdmin?.name || 'System',
        previousStatus: event.previousStatus,
        nextStatus: event.nextStatus,
        message: event.message,
        payload: event.payload,
      })),
    })
  } catch (error) {
    console.error('Order timeline error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

