import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { filterCustomerIdsInGroup, getGroupAdminIds } from '@/lib/admin-scope'

function startOfToday() {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  return dayStart
}

const PAUSE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PENDING,
  OrderStatus.IN_PROCESS,
  OrderStatus.IN_DELIVERY,
]

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const clientIds = Array.isArray(body.clientIds) ? body.clientIds : null
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : null

    if (!clientIds || clientIds.length === 0) {
      return NextResponse.json({ error: 'Не указаны ID клиентов' }, { status: 400 })
    }

    if (isActive === null) {
      return NextResponse.json({ error: 'Не указан статус активности' }, { status: 400 })
    }

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
    const allowedIds = groupAdminIds ? await filterCustomerIdsInGroup(clientIds, groupAdminIds) : clientIds
    const skippedCount = clientIds.length - allowedIds.length

    // Update clients.
    const updateResult = await db.customer.updateMany({
      where: { id: { in: allowedIds } },
      data: { isActive },
    })

    const todayStart = startOfToday()
    const dateScope = {
      OR: [
        { deliveryDate: { gte: todayStart } },
        { deliveryDate: { equals: null }, createdAt: { gte: todayStart } },
      ],
    }

    // Pause/resume orders so couriers won't see inactive clients.
    if (!isActive) {
      await db.order.updateMany({
        where: {
          customerId: { in: allowedIds },
          deletedAt: null,
          ...dateScope,
          orderStatus: { in: PAUSE_STATUSES },
        },
        data: { orderStatus: OrderStatus.PAUSED },
      })
    } else {
      await db.order.updateMany({
        where: {
          customerId: { in: allowedIds },
          deletedAt: null,
          ...dateScope,
          orderStatus: OrderStatus.PAUSED,
        },
        data: { orderStatus: OrderStatus.NEW },
      })
    }

    return NextResponse.json({
      message: `Статус ${isActive ? 'возобновлен' : 'приостановлен'} для ${updateResult.count} клиентов`,
      updatedCount: updateResult.count,
      skippedCount,
    })
  } catch (error) {
    console.error('Error toggling client status:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
    }, { status: 500 })
  }
}

