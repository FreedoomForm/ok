/**
 * Archive Order Command — Application layer.
 *
 * Handles soft-delete, restore, and permanent-delete for orders.
 * Includes role-based scoping and batch operations.
 */

import { db } from '@/modules/shared/db'
import { getGroupAdminIds } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, ForbiddenError } from '@/modules/shared/errors'
import { invalidateCache } from '@/modules/shared/cache'

// ── Input types ─────────────────────────────────────────────────────────────

export interface SoftDeleteOrdersCommand {
  user: AuthUser
  orderIds: string[]
}

export interface RestoreOrdersCommand {
  user: AuthUser
  orderIds: string[]
}

export interface PermanentDeleteOrdersCommand {
  user: AuthUser
  orderIds: string[]
}

export interface BulkUpdateOrdersCommand {
  user: AuthUser
  orderIds: string[]
  updates: {
    orderStatus?: string
    paymentStatus?: string
    deliveryDate?: string
    courierId?: string
  }
}

interface BatchResult {
  affectedCount: number
  skippedCount: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function resolveScopedOrderIds(
  orderIds: string[],
  user: AuthUser,
): Promise<{ eligibleIds: string[]; skippedCount: number }> {
  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  const eligibleOrders = await db.order.findMany({
    where: {
      id: { in: orderIds },
      ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
    },
    select: { id: true },
  })

  const eligibleIds = eligibleOrders.map((o) => o.id)
  return { eligibleIds, skippedCount: orderIds.length - eligibleIds.length }
}

// ── Command handlers ────────────────────────────────────────────────────────

export async function executeSoftDeleteOrders(
  command: SoftDeleteOrdersCommand,
): Promise<BatchResult> {
  const { user, orderIds } = command

  if (!orderIds || orderIds.length === 0) {
    throw new BadRequestError('Order IDs are required')
  }

  const { eligibleIds, skippedCount } = await resolveScopedOrderIds(orderIds, user)

  const result = await db.order.updateMany({
    where: { id: { in: eligibleIds } },
    data: { deletedAt: new Date() },
  })

  // Invalidate cache
  invalidateCache('orders:')
  invalidateCache('dashboard:')

  return { affectedCount: result.count, skippedCount }
}

export async function executeRestoreOrders(
  command: RestoreOrdersCommand,
): Promise<BatchResult> {
  const { user, orderIds } = command

  if (!orderIds || orderIds.length === 0) {
    throw new BadRequestError('Не выбраны заказы для восстановления')
  }

  const { eligibleIds, skippedCount } = await resolveScopedOrderIds(orderIds, user)

  const result = await db.order.updateMany({
    where: { id: { in: eligibleIds } },
    data: { deletedAt: null },
  })

  // Invalidate cache
  invalidateCache('orders:')
  invalidateCache('dashboard:')

  return { affectedCount: result.count, skippedCount }
}

export async function executePermanentDeleteOrders(
  command: PermanentDeleteOrdersCommand,
): Promise<BatchResult> {
  const { user, orderIds } = command

  if (!orderIds || orderIds.length === 0) {
    throw new BadRequestError('Order IDs are required')
  }

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
    throw new ForbiddenError('Insufficient permissions for permanent delete')
  }

  const { eligibleIds, skippedCount } = await resolveScopedOrderIds(orderIds, user)

  const result = await db.order.deleteMany({
    where: { id: { in: eligibleIds } },
  })

  // Invalidate cache
  invalidateCache('orders:')
  invalidateCache('dashboard:')

  return { affectedCount: result.count, skippedCount }
}

export async function executeBulkUpdateOrders(
  command: BulkUpdateOrdersCommand,
): Promise<BatchResult> {
  const { user, orderIds, updates } = command

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new BadRequestError('Не указаны ID заказов')
  }

  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    throw new BadRequestError('Не указаны данные для обновления')
  }

  const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
  const hasCourierField = Object.prototype.hasOwnProperty.call(updates, 'courierId')

  const eligibleOrders = await db.order.findMany({
    where: {
      id: { in: orderIds },
      ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
    },
    select: { id: true, orderStatus: true, courierId: true },
  })

  const eligibleOrderIds = eligibleOrders.map((o) => o.id)
  const skippedCount = orderIds.length - eligibleOrderIds.length

  // Import audit helpers lazily to avoid circular deps
  const { appendOrderAudit, getStatusTimestampPatch, getCourierAssignmentPatch } = await import('@/lib/order-audit')
  const { OrderEventType } = await import('@prisma/client')

  let updatedCount = 0

  await db.$transaction(async (tx) => {
    for (const order of eligibleOrders) {
      const rowUpdate: Record<string, unknown> = {}

      if (updates.paymentStatus) rowUpdate.paymentStatus = updates.paymentStatus
      if (updates.deliveryDate) rowUpdate.deliveryDate = new Date(updates.deliveryDate)

      if (updates.orderStatus) {
        rowUpdate.orderStatus = updates.orderStatus
        Object.assign(rowUpdate, getStatusTimestampPatch(updates.orderStatus as any))
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
        actorName: (user as any).name ?? null,
        previousStatus: order.orderStatus as any,
        nextStatus: updatedOrder.orderStatus as any,
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
          actorName: (user as any).name ?? null,
          previousStatus: order.orderStatus as any,
          nextStatus: updatedOrder.orderStatus as any,
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

  // Invalidate cache
  invalidateCache('orders:')
  invalidateCache('dashboard:')

  return { affectedCount: updatedCount, skippedCount }
}
