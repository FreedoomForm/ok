/**
 * Reorder Orders Command — Application layer.
 *
 * Handles reordering of orders after route optimization:
 * - Validates order IDs and access
 * - Validates courier assignments
 * - Two-pass update to avoid unique constraint violations on orderNumber
 * - Audit event logging
 */

import { db } from '@/modules/shared/db'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import { appendOrderAudit, getCourierAssignmentPatch } from '@/modules/orders/infrastructure/order-audit'
import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError } from '@/modules/shared/errors'
import { OrderEventType, type OrderStatus } from '@prisma/client'

// ── Input types ─────────────────────────────────────────────────────────────

export interface ReorderItem {
  orderId: string
  orderNumber: number
  courierId?: string | null
}

export interface ReorderOrdersCommand {
  user: AuthUser
  updates: ReorderItem[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sortedNumbers(values: number[]) {
  return values.slice().sort((a, b) => a - b)
}

// ── Command handler ─────────────────────────────────────────────────────────

export async function executeReorderOrders(
  command: ReorderOrdersCommand,
): Promise<{ updatedCount: number }> {
  const { user, updates } = command

  if (!updates || updates.length === 0) {
    throw new BadRequestError('No updates provided')
  }

  const orderIds = updates.map((u) => u.orderId)
  if (new Set(orderIds).size !== orderIds.length) {
    throw new BadRequestError('Duplicate orderId in payload')
  }

  const desiredOrderNumbers = updates.map((u) => u.orderNumber)
  if (new Set(desiredOrderNumbers).size !== desiredOrderNumbers.length) {
    throw new BadRequestError('Duplicate orderNumber in payload')
  }

  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  // ── Validate orders are in scope ──
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
    throw new BadRequestError('Некоторые заказы недоступны')
  }

  // Validate that orderNumbers are a permutation of existing ones
  const currentOrderNumbers = existingOrders.map((o) => o.orderNumber)
  const isPermutation =
    JSON.stringify(sortedNumbers(currentOrderNumbers)) ===
    JSON.stringify(sortedNumbers(desiredOrderNumbers))
  if (!isPermutation) {
    throw new BadRequestError(
      'Номера должны быть перестановкой текущих номеров выбранных заказов',
    )
  }

  // ── Validate courier IDs ──
  const courierIds = Array.from(
    new Set(
      updates
        .map((u) => (u.courierId == null || u.courierId === '' ? null : u.courierId))
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
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
      throw new BadRequestError('Указан неверный курьер')
    }
  }

  // ── Two-pass update to avoid unique constraint on orderNumber ──
  const maxRow = await db.order.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  })
  const maxOrderNumber = maxRow?.orderNumber ?? 0
  const offset = maxOrderNumber + 10000

  const currentById = new Map(existingOrders.map((o) => [o.id, o]))
  const finalById = new Map(
    updates.map((u) => [u.orderId, { orderNumber: u.orderNumber, courierId: u.courierId ?? null }]),
  )

  await db.$transaction(async (tx) => {
    // Pass 1: shift all orderNumbers out of the way
    for (const orderId of orderIds) {
      const current = currentById.get(orderId)
      if (!current) continue
      await tx.order.update({
        where: { id: orderId },
        data: { orderNumber: current.orderNumber + offset },
        select: { id: true },
      })
    }

    // Pass 2: set final orderNumbers and courier assignments
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
        actorName: (user as any).name ?? null,
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
          actorName: (user as any).name ?? null,
          previousStatus: current.orderStatus as OrderStatus,
          nextStatus: updated.orderStatus as OrderStatus,
          payload: {
            previousCourierId: current.courierId,
            nextCourierId: updated.courierId,
          },
          message: updated.courierId
            ? 'Courier assigned during reorder'
            : 'Courier removed during reorder',
        })
      }
    }
  })

  return { updatedCount: orderIds.length }
}
