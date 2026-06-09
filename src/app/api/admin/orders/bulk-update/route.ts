import { NextRequest, NextResponse } from 'next/server'
import { OrderEventType, type OrderStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import {
  appendOrderAudit,
  getCourierAssignmentPatch,
  getStatusTimestampPatch,
} from '@/lib/order-audit'

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { orderIds, updates } = body ?? {}

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Не указаны ID заказов' }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Не указаны данные для обновления' }, { status: 400 })
    }

    const hasCourierField = Object.prototype.hasOwnProperty.call(updates, 'courierId')

    const baseUpdate: Record<string, unknown> = {}
    if (updates.paymentStatus) baseUpdate.paymentStatus = updates.paymentStatus
    if (updates.deliveryDate) baseUpdate.deliveryDate = new Date(updates.deliveryDate)

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    const eligibleOrders = await db.order.findMany({
      where: {
        id: { in: orderIds },
        ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
      },
      select: { id: true, orderStatus: true, courierId: true },
    })

    const eligibleOrderIds = eligibleOrders.map((o) => o.id)
    const skippedCount = orderIds.length - eligibleOrderIds.length

    let updatedCount = 0

    await db.$transaction(async (tx) => {
      for (const order of eligibleOrders) {
        const rowUpdate: Record<string, unknown> = { ...baseUpdate }

        if (updates.orderStatus) {
          rowUpdate.orderStatus = updates.orderStatus
          Object.assign(rowUpdate, getStatusTimestampPatch(updates.orderStatus as OrderStatus))
        }

        if (hasCourierField) {
          const nextCourierId =
            updates.courierId === 'none' || updates.courierId === '' ? null : updates.courierId
          rowUpdate.courierId = nextCourierId
          Object.assign(rowUpdate, getCourierAssignmentPatch(order.courierId, nextCourierId))
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: rowUpdate,
          select: { id: true, orderStatus: true, courierId: true, paymentStatus: true },
        })

        updatedCount += 1

        const eventType = updates.orderStatus
          ? OrderEventType.STATUS_CHANGED
          : updates.paymentStatus
            ? OrderEventType.PAYMENT_UPDATED
            : OrderEventType.DETAILS_UPDATED

        await appendOrderAudit(tx, {
          orderId: updatedOrder.id,
          eventType,
          actorAdminId: user.id,
          actorRole: user.role,
          actorName: (user as { name?: string }).name ?? null,
          previousStatus: order.orderStatus as OrderStatus,
          nextStatus: updatedOrder.orderStatus as OrderStatus,
          payload: {
            updates,
            previousCourierId: order.courierId,
            nextCourierId: updatedOrder.courierId,
          },
          message: 'Bulk order update applied',
        })

        if (hasCourierField && order.courierId !== updatedOrder.courierId) {
          await appendOrderAudit(tx, {
            orderId: updatedOrder.id,
            eventType: updatedOrder.courierId
              ? OrderEventType.COURIER_ASSIGNED
              : OrderEventType.COURIER_UNASSIGNED,
            actorAdminId: user.id,
            actorRole: user.role,
            actorName: (user as { name?: string }).name ?? null,
            previousStatus: order.orderStatus as OrderStatus,
            nextStatus: updatedOrder.orderStatus as OrderStatus,
            payload: {
              previousCourierId: order.courierId,
              nextCourierId: updatedOrder.courierId,
            },
            message: updatedOrder.courierId
              ? 'Courier assigned in bulk update'
              : 'Courier removed in bulk update',
          })
        }
      }
    })

    return NextResponse.json({
      message: 'Заказы успешно обновлены',
      updatedCount,
      skippedCount,
    })
  } catch (error) {
    console.error('Bulk update orders error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
