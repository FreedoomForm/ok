import { NextRequest, NextResponse } from 'next/server'
import { OrderEventType, type OrderStatus } from '@prisma/client'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { appendOrderAudit, getCourierAssignmentPatch } from '@/lib/order-audit'

const updateSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.number().int(),
  courierId: z.string().min(1).nullable().optional(),
})

const bodySchema = z.object({
  updates: z.array(updateSchema).min(1),
})

function sortedNumbers(values: number[]) {
  return values.slice().sort((a, b) => a - b)
}

export async function PATCH(request: NextRequest) {
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

    const updates = parsed.data.updates
    const orderIds = updates.map((u) => u.orderId)
    if (new Set(orderIds).size !== orderIds.length) {
      return NextResponse.json({ error: 'Duplicate orderId in payload' }, { status: 400 })
    }

    const desiredOrderNumbers = updates.map((u) => u.orderNumber)
    if (new Set(desiredOrderNumbers).size !== desiredOrderNumbers.length) {
      return NextResponse.json({ error: 'Duplicate orderNumber in payload' }, { status: 400 })
    }

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    const existingOrders = await db.order.findMany({
      where: {
        id: { in: orderIds },
        ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
      },
      select: { id: true, orderNumber: true, adminId: true, courierId: true, orderStatus: true },
    })

    if (existingOrders.length !== orderIds.length) {
      const found = new Set(existingOrders.map((o) => o.id))
      const missing = orderIds.filter((id) => !found.has(id))
      return NextResponse.json({ error: 'Некоторые заказы недоступны', missing }, { status: 404 })
    }

    const currentOrderNumbers = existingOrders.map((o) => o.orderNumber)
    const isPermutation =
      JSON.stringify(sortedNumbers(currentOrderNumbers)) === JSON.stringify(sortedNumbers(desiredOrderNumbers))
    if (!isPermutation) {
      return NextResponse.json(
        { error: 'Номера должны быть перестановкой текущих номеров выбранных заказов' },
        { status: 400 }
      )
    }

    const courierIds = Array.from(
      new Set(
        updates
          .map((u) => (u.courierId == null || u.courierId === '' ? null : u.courierId))
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
      )
    )

    if (courierIds.length > 0) {
      const couriers = await db.admin.findMany({
        where: {
          id: { in: courierIds },
          role: 'COURIER',
          ...(groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}),
        },
        select: { id: true },
      })
      if (couriers.length !== courierIds.length) {
        const found = new Set(couriers.map((c) => c.id))
        const missing = courierIds.filter((id) => !found.has(id))
        return NextResponse.json({ error: 'Указан неверный курьер', missing }, { status: 400 })
      }
    }

    const maxRow = await db.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const maxOrderNumber = maxRow?.orderNumber ?? 0
    const offset = maxOrderNumber + 10000

    const currentById = new Map(existingOrders.map((o) => [o.id, o]))
    const finalById = new Map(
      updates.map((u) => [u.orderId, { orderNumber: u.orderNumber, courierId: u.courierId ?? null }])
    )

    await db.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        const current = currentById.get(orderId)
        if (!current) continue
        await tx.order.update({
          where: { id: orderId },
          data: { orderNumber: current.orderNumber + offset },
          select: { id: true },
        })
      }

      for (const orderId of orderIds) {
        const current = currentById.get(orderId)
        const next = finalById.get(orderId)
        if (!current || !next) continue

        const nextCourierId = next.courierId === 'null' || next.courierId === '' ? null : next.courierId

        const updateData: Record<string, unknown> = {
          orderNumber: next.orderNumber,
          courierId: nextCourierId,
          sequenceInRoute: next.orderNumber,
        }
        Object.assign(updateData, getCourierAssignmentPatch(current.courierId, nextCourierId))

        const updated = await tx.order.update({
          where: { id: orderId },
          data: updateData,
          select: { id: true, orderStatus: true, courierId: true, orderNumber: true },
        })

        await appendOrderAudit(tx, {
          orderId: updated.id,
          eventType: OrderEventType.REORDERED,
          actorAdminId: user.id,
          actorRole: user.role,
          actorName: (user as { name?: string }).name ?? null,
          previousStatus: current.orderStatus as OrderStatus,
          nextStatus: updated.orderStatus as OrderStatus,
          payload: {
            previousOrderNumber: current.orderNumber,
            nextOrderNumber: updated.orderNumber,
            previousCourierId: current.courierId,
            nextCourierId: updated.courierId,
          },
          message: 'Order reordered',
        })

        if (current.courierId !== updated.courierId) {
          await appendOrderAudit(tx, {
            orderId: updated.id,
            eventType: updated.courierId
              ? OrderEventType.COURIER_ASSIGNED
              : OrderEventType.COURIER_UNASSIGNED,
            actorAdminId: user.id,
            actorRole: user.role,
            actorName: (user as { name?: string }).name ?? null,
            previousStatus: current.orderStatus as OrderStatus,
            nextStatus: updated.orderStatus as OrderStatus,
            payload: {
              previousCourierId: current.courierId,
              nextCourierId: updated.courierId,
            },
            message: updated.courierId ? 'Courier assigned during reorder' : 'Courier removed during reorder',
          })
        }
      }
    })

    return NextResponse.json({ message: 'OK', updatedCount: orderIds.length })
  } catch (error) {
    console.error('Orders reorder error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
