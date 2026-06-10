/**
 * Update Order Status Command — Application layer.
 *
 * Handles the PATCH /api/orders/[orderId] action-based update pattern:
 * - start_delivery, pause_delivery, resume_delivery, complete_delivery (courier)
 * - update_details (admin)
 *
 * Includes:
 * - Role-based authorization per action
 * - Finance transaction recording for payments
 * - Audit event logging
 */

import { db } from '@/modules/shared/db'
import { getOwnerAdminId, getGroupAdminIds } from '@/lib/admin-scope'
import { appendOrderAudit, getCourierAssignmentPatch, getStatusTimestampPatch } from '@/lib/order-audit'
import type { AuthUser } from '@/lib/auth-utils'
import type { OrderDetail } from '../../contracts'
import {
  updateOrder,
  type UpdateOrderInput,
} from '../../infrastructure/order.repository'
import type { OrderStatus as PrismaOrderStatus, OrderEventType as PrismaOrderEventType } from '@prisma/client'
import { OrderStatus, OrderEventType, Prisma } from '@prisma/client'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'

// ── Input types ─────────────────────────────────────────────────────────────

export type OrderAction =
  | 'start_delivery'
  | 'pause_delivery'
  | 'resume_delivery'
  | 'complete_delivery'
  | 'update_details'

export interface UpdateOrderDetailsData {
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  deliveryTime?: string
  quantity?: number | string
  calories?: number | string
  specialFeatures?: string
  paymentStatus?: string
  paymentMethod?: string
  isPrepaid?: boolean
  amountReceived?: number | string | null
  date?: string
  courierId?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  assignedSetId?: string | null
}

export interface UpdateOrderStatusCommand {
  user: AuthUser
  orderId: string
  action: OrderAction
  details?: UpdateOrderDetailsData
  amountReceived?: number | string | null // for complete_delivery
}

// ── Command handler ─────────────────────────────────────────────────────────

export async function executeUpdateOrderStatus(
  command: UpdateOrderStatusCommand,
): Promise<OrderDetail> {
  const { user, orderId, action } = command

  // ── Fetch existing order ──
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderStatus: true,
      courierId: true,
      adminId: true,
      customerId: true,
      amountReceived: true,
      isPrepaid: true,
      quantity: true,
      orderNumber: true,
      customer: {
        select: {
          id: true,
          dailyPrice: true,
          assignedSetId: true,
          name: true,
          phone: true,
        },
      },
    },
  })

  if (!order) {
    throw new NotFoundError('Order', orderId)
  }

  // ── Authorization ──
  if (user.role === 'COURIER') {
    if (!['start_delivery', 'pause_delivery', 'resume_delivery', 'complete_delivery'].includes(action)) {
      throw new ForbiddenError('Недостаточно прав')
    }
    if (order.courierId !== user.id) {
      throw new ForbiddenError('Недостаточно прав')
    }
  } else if (user.role === 'LOW_ADMIN') {
    const groupAdminIds = await getGroupAdminIds(user)
    const inGroup = !!order.adminId && !!groupAdminIds && groupAdminIds.includes(order.adminId)
    if (!inGroup && action !== 'start_delivery') {
      throw new ForbiddenError('Недостаточно прав')
    }
  } else if (user.role === 'MIDDLE_ADMIN') {
    if (action !== 'start_delivery' && action !== 'update_details') {
      // allow through
    } else {
      const lowAdmins = await db.admin.findMany({
        where: { createdBy: user.id, role: 'LOW_ADMIN' },
        select: { id: true },
      })
      const allowedAdminIds = [user.id, ...lowAdmins.map((a) => a.id)]
      if (!order.adminId || !allowedAdminIds.includes(order.adminId)) {
        throw new ForbiddenError('Недостаточно прав')
      }
    }
  }
  // SUPER_ADMIN can modify all orders

  const previousStatus = order.orderStatus as PrismaOrderStatus
  const previousCourierId = order.courierId

  // ── Resolve finance admin ID ──
  const resolveFinanceAdminId = async (): Promise<string> => {
    if (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') {
      return (await getOwnerAdminId(user)) ?? user.id
    }
    if (!order.adminId) return user.id
    const admin = await db.admin.findUnique({
      where: { id: order.adminId },
      select: { id: true, role: true, createdBy: true },
    })
    if (!admin) return order.adminId
    if (admin.role === 'MIDDLE_ADMIN') return admin.id
    if (admin.role === 'LOW_ADMIN' || admin.role === 'COURIER') return admin.createdBy ?? admin.id
    return admin.id
  }

  let updateInput: UpdateOrderInput = {}
  let eventType: PrismaOrderEventType = OrderEventType.DETAILS_UPDATED
  let eventMessage = 'Order updated'
  let extraAuditEvents: Array<{
    eventType: PrismaOrderEventType
    payload: Record<string, unknown>
    message: string
  }> = []

  switch (action) {
    case 'start_delivery': {
      if (order.orderStatus !== 'PENDING') {
        throw new BadRequestError('Можно начать только ожидающий заказ')
      }
      updateInput = {
        orderStatus: 'IN_DELIVERY',
        courierId: user.id,
        ...getStatusTimestampPatch('IN_DELIVERY'),
        ...getCourierAssignmentPatch(order.courierId, user.id),
      }
      eventType = OrderEventType.DELIVERY_STARTED
      eventMessage = 'Courier started delivery'
      break
    }
    case 'pause_delivery': {
      if (order.orderStatus !== 'IN_DELIVERY') {
        throw new BadRequestError('Можно приостановить только активную доставку')
      }
      updateInput = {
        orderStatus: 'PAUSED',
        ...getStatusTimestampPatch('PAUSED'),
      }
      eventType = OrderEventType.DELIVERY_PAUSED
      eventMessage = 'Delivery paused'
      break
    }
    case 'resume_delivery': {
      if (order.orderStatus !== 'PAUSED') {
        throw new BadRequestError('Можно возобновить только приостановленную доставку')
      }
      updateInput = {
        orderStatus: 'IN_DELIVERY',
        ...getStatusTimestampPatch('IN_DELIVERY'),
      }
      eventType = OrderEventType.DELIVERY_RESUMED
      eventMessage = 'Delivery resumed'
      break
    }
    case 'complete_delivery': {
      if (order.orderStatus === 'DELIVERED') {
        throw new BadRequestError('Заказ уже доставлен')
      }

      const financeAdminId = await resolveFinanceAdminId()
      const transactionOps: Prisma.PrismaPromise<unknown>[] = []

      const dailyPrice = order.customer?.dailyPrice || 84000
      transactionOps.push(
        db.transaction.create({
          data: {
            amount: dailyPrice,
            type: 'EXPENSE',
            category: 'MEAL_DEDUCTION',
            description: `Списание за дневной рацион (Заказ #${order.orderNumber})`,
            adminId: financeAdminId,
            customerId: order.customerId,
          },
        }),
        db.customer.update({
          where: { id: order.customerId },
          data: { balance: { decrement: dailyPrice } },
        }),
      )

      // Amount received from courier
      const amountReceivedDelta = command.amountReceived
      const parsedDeltaRaw =
        amountReceivedDelta !== undefined && amountReceivedDelta !== null && String(amountReceivedDelta).trim() !== ''
          ? Number(amountReceivedDelta)
          : 0
      const parsedDelta = Number.isFinite(parsedDeltaRaw) ? parsedDeltaRaw : 0
      const delta = parsedDelta > 0 ? parsedDelta : 0
      const previousAmountReceived = typeof order.amountReceived === 'number' ? order.amountReceived : 0
      const nextAmountReceived = previousAmountReceived + delta

      updateInput = {
        orderStatus: 'DELIVERED',
        ...getStatusTimestampPatch('DELIVERED'),
      }

      if (delta > 0) {
        updateInput.amountReceived = nextAmountReceived
        transactionOps.push(
          db.transaction.create({
            data: {
              amount: delta,
              type: 'INCOME',
              category: 'ORDER_PAYMENT',
              description: `Оплата за заказ #${order.orderNumber} (Курьер: ${(user as any).name || 'Unknown'})`,
              adminId: financeAdminId,
              customerId: order.customerId,
            },
          }),
          db.customer.update({
            where: { id: order.customerId },
            data: { balance: { increment: delta } },
          }),
          db.admin.update({
            where: { id: financeAdminId },
            data: { companyBalance: { increment: delta } },
          }),
        )
      } else if (previousAmountReceived > 0) {
        updateInput.amountReceived = previousAmountReceived
      }

      const effectiveReceived =
        typeof updateInput.amountReceived === 'number' ? updateInput.amountReceived : previousAmountReceived
      const totalOrderCost = dailyPrice * (order.quantity || 1)
      if (effectiveReceived >= totalOrderCost) {
        updateInput.paymentStatus = 'PAID'
      } else if (!order.isPrepaid) {
        updateInput.paymentStatus = 'UNPAID'
      }

      if (transactionOps.length > 0) {
        await db.$transaction(transactionOps)
      }

      eventType = OrderEventType.DELIVERY_COMPLETED
      eventMessage = 'Delivery completed'
      break
    }
    case 'update_details': {
      const details = command.details
      if (!details) {
        throw new BadRequestError('No details provided for update_details action')
      }

      const hasAssignedSetId = Object.prototype.hasOwnProperty.call(details, 'assignedSetId')
      const hasLatitude = Object.prototype.hasOwnProperty.call(details, 'latitude')
      const hasLongitude = Object.prototype.hasOwnProperty.call(details, 'longitude')

      const sanitizedAssignedSetId =
        details.assignedSetId === '' || details.assignedSetId === 'null' || details.assignedSetId === undefined
          ? null
          : String(details.assignedSetId)

      if (hasAssignedSetId) {
        if (sanitizedAssignedSetId && user.role !== 'SUPER_ADMIN') {
          const set = await db.menuSet.findFirst({
            where: { id: sanitizedAssignedSetId, adminId: (await getOwnerAdminId(user)) ?? user.id },
            select: { id: true },
          })
          if (!set) {
            throw new BadRequestError('Указан неверный сет')
          }
        }
        await db.customer.update({
          where: { id: order.customerId },
          data: { assignedSetId: sanitizedAssignedSetId },
        })
      }

      let parsedCalories: number | undefined
      if (details.calories !== undefined) {
        parsedCalories = parseInt(String(details.calories))
        if (isNaN(parsedCalories)) throw new BadRequestError('Калории должны быть числом')
      }

      let parsedQuantity: number | undefined
      if (details.quantity !== undefined) {
        parsedQuantity = parseInt(String(details.quantity))
        if (isNaN(parsedQuantity)) throw new BadRequestError('Количество должно быть числом')
      }

      if (details.date && isNaN(Date.parse(details.date))) {
        throw new BadRequestError('Неверный формат даты')
      }

      let sanitizedLatitude: number | null | undefined
      if (hasLatitude) {
        if (details.latitude === '' || details.latitude === null || details.latitude === 'null') {
          sanitizedLatitude = null
        } else {
          const lat = parseFloat(String(details.latitude))
          if (isNaN(lat) || lat < -90 || lat > 90) throw new BadRequestError('Invalid latitude coordinates format')
          sanitizedLatitude = lat
        }
      }

      let sanitizedLongitude: number | null | undefined
      if (hasLongitude) {
        if (details.longitude === '' || details.longitude === null || details.longitude === 'null') {
          sanitizedLongitude = null
        } else {
          const lng = parseFloat(String(details.longitude))
          if (isNaN(lng) || lng < -180 || lng > 180) throw new BadRequestError('Invalid longitude coordinates format')
          sanitizedLongitude = lng
        }
      }

      const nextCourierId = (details.courierId === 'null' || details.courierId === '') ? null : details.courierId

      // Handle amount received changes
      const hasAmountReceived = Object.prototype.hasOwnProperty.call(details, 'amountReceived')
      let nextAmountReceivedOverride: number | null | undefined = undefined

      if (hasAmountReceived) {
        const parsedRaw =
          details.amountReceived !== undefined && details.amountReceived !== null && String(details.amountReceived).trim() !== ''
            ? Number(details.amountReceived)
            : 0
        const parsed = Number.isFinite(parsedRaw) ? parsedRaw : 0
        nextAmountReceivedOverride = parsed > 0 ? parsed : null

        const previousValue = typeof order.amountReceived === 'number' ? order.amountReceived : 0
        const nextValue = typeof nextAmountReceivedOverride === 'number' ? nextAmountReceivedOverride : 0
        const amountDelta = nextValue - previousValue

        if (amountDelta !== 0) {
          const financeAdminId = await resolveFinanceAdminId()
          const txType = amountDelta > 0 ? 'INCOME' : 'EXPENSE'
          const txAmount = Math.abs(amountDelta)

          await db.$transaction([
            db.transaction.create({
              data: {
                amount: txAmount,
                type: txType,
                category: 'ORDER_PAYMENT',
                description: `Order payment adjustment (Order #${order.orderNumber})`,
                adminId: financeAdminId,
                customerId: order.customerId,
              },
            }),
            db.customer.update({
              where: { id: order.customerId },
              data: { balance: { increment: amountDelta } },
            }),
            db.admin.update({
              where: { id: financeAdminId },
              data: { companyBalance: { increment: amountDelta } },
            }),
          ])
        }
      }

      // Compute payment status
      const effectiveDailyPrice = order.customer?.dailyPrice || 84000
      const effectiveQuantity =
        typeof parsedQuantity === 'number' && Number.isFinite(parsedQuantity)
          ? parsedQuantity
          : (order.quantity || 1)
      const totalOrderCostForEdit = effectiveDailyPrice * effectiveQuantity
      const effectiveAmountReceived = hasAmountReceived
        ? (typeof nextAmountReceivedOverride === 'number' ? nextAmountReceivedOverride : 0)
        : (typeof order.amountReceived === 'number' ? order.amountReceived : 0)
      const effectiveIsPrepaid = typeof details.isPrepaid === 'boolean' ? details.isPrepaid : order.isPrepaid
      let computedPaymentStatus: string | undefined
      if (hasAmountReceived) {
        if (effectiveAmountReceived >= totalOrderCostForEdit && totalOrderCostForEdit > 0) {
          computedPaymentStatus = 'PAID'
        } else if (!effectiveIsPrepaid) {
          computedPaymentStatus = 'UNPAID'
        }
      }

      updateInput = {
        deliveryAddress: details.deliveryAddress,
        deliveryTime: details.deliveryTime,
        quantity: parsedQuantity,
        calories: parsedCalories,
        specialFeatures: details.specialFeatures,
        paymentStatus: computedPaymentStatus ?? details.paymentStatus,
        paymentMethod: details.paymentMethod,
        isPrepaid: details.isPrepaid,
        deliveryDate: details.date ? new Date(details.date) : undefined,
        courierId: nextCourierId,
        ...(hasAmountReceived ? { amountReceived: nextAmountReceivedOverride } : {}),
        ...(hasLatitude ? { latitude: sanitizedLatitude } : {}),
        ...(hasLongitude ? { longitude: sanitizedLongitude } : {}),
        ...getCourierAssignmentPatch(order.courierId, nextCourierId),
      }

      if (details.paymentStatus || details.paymentMethod || hasAmountReceived) {
        eventType = OrderEventType.PAYMENT_UPDATED
        eventMessage = 'Payment details updated'
      } else {
        eventType = OrderEventType.DETAILS_UPDATED
        eventMessage = 'Order details updated'
      }
      break
    }
    default:
      throw new BadRequestError('Неизвестное действие')
  }

  // ── Execute update ──
  const updatedOrder = await updateOrder(orderId, updateInput)

  // ── Audit: Main event ──
  await appendOrderAudit(db, {
    orderId: updatedOrder.id,
    eventType,
    actorAdminId: user.id,
    actorRole: user.role,
    actorName: (user as any).name || null,
    previousStatus,
    nextStatus: updatedOrder.orderStatus as PrismaOrderStatus,
    payload: {
      action,
      courierId: updatedOrder.courierId,
      paymentStatus: updatedOrder.paymentStatus,
    },
    message: eventMessage,
  })

  // ── Audit: Courier change ──
  if (previousCourierId !== updatedOrder.courierId) {
    await appendOrderAudit(db, {
      orderId: updatedOrder.id,
      eventType: updatedOrder.courierId
        ? OrderEventType.COURIER_ASSIGNED
        : OrderEventType.COURIER_UNASSIGNED,
      actorAdminId: user.id,
      actorRole: user.role,
      actorName: (user as any).name || null,
      previousStatus,
      nextStatus: updatedOrder.orderStatus as PrismaOrderStatus,
      payload: {
        previousCourierId,
        nextCourierId: updatedOrder.courierId,
      },
      message: updatedOrder.courierId ? 'Courier assigned' : 'Courier unassigned',
    })
  }

  return updatedOrder
}
