import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { OrderEventType, type OrderStatus, Prisma } from '@prisma/client'
import { appendOrderAudit, getCourierAssignmentPatch, getStatusTimestampPatch } from '@/lib/order-audit'
import { calculateDeliverySettlement, calculatePaymentAdjustment } from '@/lib/orders/settlement'
import { orderLifecycleRequestSchema } from '@/lib/orders/lifecycle'

type FinanceSettlement = {
  financeAdminId: string
  dailyPrice: number
  paymentDelta: number
}

class ConcurrentOrderUpdateError extends Error {
  constructor() {
    super('ORDER_CONCURRENT_UPDATE')
    this.name = 'ConcurrentOrderUpdateError'
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }
    if (!hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { orderId } = await context.params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsedRequest = orderLifecycleRequestSchema.safeParse(body)
    if (!parsedRequest.success) {
      const firstIssue = parsedRequest.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.path[0] === 'action' ? 'Неизвестное действие' : firstIssue?.message || 'Invalid order lifecycle payload' },
        { status: 400 },
      )
    }

    const payload = parsedRequest.data
    const { action } = payload

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            dailyPrice: true,
            assignedSetId: true,
            assignedSet: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    // Authorization check: Verify user has permission to modify this order
    if (user.role === 'LOW_ADMIN') {
      // LOW_ADMIN can only modify orders within their owner group
      const groupAdminIds = await getGroupAdminIds(user)
      const inGroup = !!order.adminId && !!groupAdminIds && groupAdminIds.includes(order.adminId)
      if (!inGroup && action !== 'start_delivery') {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    } else if (user.role === 'MIDDLE_ADMIN') {
      // MIDDLE_ADMIN can modify their orders and their low admins' orders
      if (action !== 'start_delivery' && action !== 'update_details') {
        // For courier actions, delegate to courier role check below
      } else {
        const lowAdmins = await db.admin.findMany({
          where: { createdBy: user.id, role: 'LOW_ADMIN' },
          select: { id: true }
        })
        const allowedAdminIds = [user.id, ...lowAdmins.map(a => a.id)]

        if (!order.adminId || !allowedAdminIds.includes(order.adminId)) {
          return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }
      }
    } else if (user.role === 'COURIER') {
      // Couriers can only execute delivery actions on orders assigned to themselves.
      if (!['start_delivery', 'pause_delivery', 'resume_delivery', 'complete_delivery'].includes(action)) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
      if (order.courierId !== user.id) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    }
    // SUPER_ADMIN can modify all orders (no restriction)

    let updateData: any = {}
    let eventType: OrderEventType = OrderEventType.DETAILS_UPDATED
    let eventMessage = 'Order updated'
    const previousStatus = order.orderStatus as OrderStatus
    const previousCourierId = order.courierId
    let financeSettlement: FinanceSettlement | null = null
    let paymentAdjustment: { financeAdminId: string; delta: number } | null = null
    let assignedSetIdUpdate: string | null | undefined = undefined

    // Finance scope (transactions + company balance) is tied to the "owner" middle-admin of the order's group.
    // This keeps finance tabs consistent for LOW_ADMIN / COURIER flows.
    const resolveFinanceAdminId = async () => {
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

    switch (action) {
      case 'start_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может начать доставку' }, { status: 403 })
        }
        if (order.orderStatus !== 'PENDING') {
          return NextResponse.json({ error: 'Можно начать только ожидающий заказ' }, { status: 400 })
        }
        updateData.orderStatus = 'IN_DELIVERY'
        updateData.courierId = user.id
        Object.assign(updateData, getStatusTimestampPatch('IN_DELIVERY'))
        Object.assign(updateData, getCourierAssignmentPatch(order.courierId, user.id))
        eventType = OrderEventType.DELIVERY_STARTED
        eventMessage = 'Courier started delivery'
        break
      case 'pause_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может приостановить доставку' }, { status: 403 })
        }
        if (order.orderStatus !== 'IN_DELIVERY') {
          return NextResponse.json({ error: 'Можно приостановить только активную доставку' }, { status: 400 })
        }
        updateData.orderStatus = 'PAUSED'
        Object.assign(updateData, getStatusTimestampPatch('PAUSED'))
        eventType = OrderEventType.DELIVERY_PAUSED
        eventMessage = 'Delivery paused'
        break
      case 'resume_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может возобновить доставку' }, { status: 403 })
        }
        if (order.orderStatus !== 'PAUSED') {
          return NextResponse.json({ error: 'Можно возобновить только приостановленную доставку' }, { status: 400 })
        }
        updateData.orderStatus = 'IN_DELIVERY'
        Object.assign(updateData, getStatusTimestampPatch('IN_DELIVERY'))
        eventType = OrderEventType.DELIVERY_RESUMED
        eventMessage = 'Delivery resumed'
        break
      case 'complete_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может завершить доставку' }, { status: 403 })
        }

        if (order.orderStatus === 'DELIVERED') {
          return NextResponse.json({ error: 'Заказ уже доставлен' }, { status: 400 })
        }

        const { amountReceived: amountReceivedDelta } = payload
        updateData.orderStatus = 'DELIVERED'
        Object.assign(updateData, getStatusTimestampPatch('DELIVERED'))
        eventType = OrderEventType.DELIVERY_COMPLETED
        eventMessage = 'Delivery completed'

        const financeAdminId = await resolveFinanceAdminId()
        const dailyPrice = (order.customer as any)?.dailyPrice || 84000

        const settlement = calculateDeliverySettlement({
          dailyPrice,
          quantity: order.quantity,
          previousAmountReceived: order.amountReceived,
          amountReceivedDelta,
          isPrepaid: order.isPrepaid,
        })

        if (settlement.paymentDelta > 0 || settlement.nextAmountReceived > 0) {
          updateData.amountReceived = settlement.nextAmountReceived
        }
        if (settlement.paymentStatus) updateData.paymentStatus = settlement.paymentStatus

        financeSettlement = {
          financeAdminId,
          dailyPrice: settlement.dailyPrice,
          paymentDelta: settlement.paymentDelta,
        }
        break
      case 'update_details':
        if (!hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
          return NextResponse.json({ error: 'Недостаточно прав для редактирования' }, { status: 403 })
        }

        const hasAssignedSetId = Object.prototype.hasOwnProperty.call(payload, 'assignedSetId')
        const hasLatitude = Object.prototype.hasOwnProperty.call(payload, 'latitude')
        const hasLongitude = Object.prototype.hasOwnProperty.call(payload, 'longitude')
        const {
          customerName: _customerName,
          customerPhone: _customerPhone,
          deliveryAddress,
          deliveryTime,
          quantity,
          calories,
          specialFeatures,
          paymentStatus,
          paymentMethod,
          isPrepaid,
          amountReceived,
          date,
          courierId,
          latitude,
          longitude,
          assignedSetId: rawAssignedSetId
        } = payload

        const sanitizedAssignedSetId =
          rawAssignedSetId === '' || rawAssignedSetId === 'null' || rawAssignedSetId === undefined
            ? null
            : String(rawAssignedSetId)

        if (hasAssignedSetId) {
          if (sanitizedAssignedSetId && user.role !== 'SUPER_ADMIN') {
            const set = await db.menuSet.findFirst({
              where: { id: sanitizedAssignedSetId, adminId: (await getOwnerAdminId(user)) ?? user.id },
              select: { id: true }
            })
            if (!set) {
              return NextResponse.json({ error: 'Указан неверный сет' }, { status: 400 })
            }
          }

          assignedSetIdUpdate = sanitizedAssignedSetId
        }

        // Validate numeric fields if provided
        let parsedCalories
        if (calories !== undefined) {
          parsedCalories = calories
        }

        let parsedQuantity
        if (quantity !== undefined) {
          parsedQuantity = quantity
        }

        // Validate date if provided
        if (date && isNaN(Date.parse(date))) {
          return NextResponse.json({ error: 'Неверный формат даты' }, { status: 400 })
        }

        let sanitizedLatitude: number | null | undefined
        if (hasLatitude) {
          if (latitude === '' || latitude === null || latitude === 'null') {
            sanitizedLatitude = null
          } else {
            const lat = parseFloat(String(latitude))
            if (isNaN(lat) || lat < -90 || lat > 90) {
              return NextResponse.json({ error: 'Invalid latitude coordinates format' }, { status: 400 })
            }
            sanitizedLatitude = lat
          }
        }

        let sanitizedLongitude: number | null | undefined
        if (hasLongitude) {
          if (longitude === '' || longitude === null || longitude === 'null') {
            sanitizedLongitude = null
          } else {
            const lng = parseFloat(String(longitude))
            if (isNaN(lng) || lng < -180 || lng > 180) {
              return NextResponse.json({ error: 'Invalid longitude coordinates format' }, { status: 400 })
            }
            sanitizedLongitude = lng
          }
        }

        // Update customer info if name/phone changed and it's a manual order or we want to update the linked customer
        // For now, we'll just update the order fields. Updating the customer entity is a separate concern.

        const nextCourierId = (courierId === 'null' || courierId === '') ? null : courierId

        const hasAmountReceived = Object.prototype.hasOwnProperty.call(payload, 'amountReceived')
        let nextAmountReceivedOverride: number | null | undefined = undefined

        if (hasAmountReceived) {
          const adjustment = calculatePaymentAdjustment(order.amountReceived, amountReceived)
          nextAmountReceivedOverride = adjustment.nextAmountReceived

          if (adjustment.delta !== 0) {
            const financeAdminId = await resolveFinanceAdminId()
            paymentAdjustment = { financeAdminId, delta: adjustment.delta }
          }
        }

        const effectiveDailyPrice = (order.customer as any)?.dailyPrice || 84000
        const effectiveQuantity =
          typeof parsedQuantity === 'number' && Number.isFinite(parsedQuantity)
            ? parsedQuantity
            : (order.quantity || 1)
        const totalOrderCostForEdit = effectiveDailyPrice * effectiveQuantity
        const effectiveAmountReceived = hasAmountReceived
          ? (typeof nextAmountReceivedOverride === 'number' ? nextAmountReceivedOverride : 0)
          : (typeof order.amountReceived === 'number' ? order.amountReceived : 0)
        const effectiveIsPrepaid = typeof isPrepaid === 'boolean' ? isPrepaid : order.isPrepaid
        let computedPaymentStatus: 'PAID' | 'UNPAID' | undefined
        if (hasAmountReceived) {
          if (effectiveAmountReceived >= totalOrderCostForEdit && totalOrderCostForEdit > 0) {
            computedPaymentStatus = 'PAID'
          } else if (!effectiveIsPrepaid) {
            computedPaymentStatus = 'UNPAID'
          }
        }

        updateData = {
          ...updateData,
          deliveryAddress,
          deliveryTime,
          quantity: parsedQuantity,
          calories: parsedCalories,
          specialFeatures,
          paymentStatus: computedPaymentStatus ?? paymentStatus,
          paymentMethod,
          isPrepaid,
          deliveryDate: date ? new Date(date) : undefined,
          courierId: nextCourierId,
          ...(hasAmountReceived ? { amountReceived: nextAmountReceivedOverride } : {}),
          ...(hasLatitude ? { latitude: sanitizedLatitude } : {}),
          ...(hasLongitude ? { longitude: sanitizedLongitude } : {})
        }
        Object.assign(updateData, getCourierAssignmentPatch(order.courierId, nextCourierId))
        if (paymentStatus || paymentMethod || hasAmountReceived) {
          eventType = OrderEventType.PAYMENT_UPDATED
          eventMessage = 'Payment details updated'
        } else {
          eventType = OrderEventType.DETAILS_UPDATED
          eventMessage = 'Order details updated'
        }
        break
      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }

    const updatedOrder = await db.$transaction(async (tx) => {
      if (assignedSetIdUpdate !== undefined) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { assignedSetId: assignedSetIdUpdate },
        })
      }

      const updateResult = await tx.order.updateMany({
        where: { id: orderId, orderStatus: previousStatus },
        data: updateData,
      })

      if (updateResult.count !== 1) {
        throw new ConcurrentOrderUpdateError()
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
              assignedSetId: true,
              assignedSet: { select: { id: true, name: true } }
            }
          },
          courier: { select: { id: true, name: true } }
        }
      })

      if (!updatedOrder) {
        throw new ConcurrentOrderUpdateError()
      }

      if (financeSettlement) {
        await tx.transaction.create({
          data: {
            amount: financeSettlement.dailyPrice,
            type: 'EXPENSE',
            category: 'MEAL_DEDUCTION',
            description: `Списание за дневной рацион (Заказ #${order.orderNumber})`,
            adminId: financeSettlement.financeAdminId,
            customerId: order.customerId,
          },
        })
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { decrement: financeSettlement.dailyPrice } },
        })

        if (financeSettlement.paymentDelta > 0) {
          await tx.transaction.create({
            data: {
              amount: financeSettlement.paymentDelta,
              type: 'INCOME',
              category: 'ORDER_PAYMENT',
              description: `Оплата за заказ #${order.orderNumber} (Курьер: ${user.name || 'Unknown'})`,
              adminId: financeSettlement.financeAdminId,
              customerId: order.customerId,
            },
          })
          await tx.customer.update({
            where: { id: order.customerId },
            data: { balance: { increment: financeSettlement.paymentDelta } },
          })
          await tx.admin.update({
            where: { id: financeSettlement.financeAdminId },
            data: { companyBalance: { increment: financeSettlement.paymentDelta } },
          })
        }
      }

      if (paymentAdjustment) {
        const txType = paymentAdjustment.delta > 0 ? 'INCOME' : 'EXPENSE'
        const txAmount = Math.abs(paymentAdjustment.delta)
        await tx.transaction.create({
          data: {
            amount: txAmount,
            type: txType,
            category: 'ORDER_PAYMENT',
            description: `Order payment adjustment (Order #${order.orderNumber})`,
            adminId: paymentAdjustment.financeAdminId,
            customerId: order.customerId,
          },
        })
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { increment: paymentAdjustment.delta } },
        })
        await tx.admin.update({
          where: { id: paymentAdjustment.financeAdminId },
          data: { companyBalance: { increment: paymentAdjustment.delta } },
        })
      }

      const nextStatus = updatedOrder.orderStatus as OrderStatus
      await appendOrderAudit(tx, {
        orderId: updatedOrder.id,
        eventType,
        actorAdminId: user.id,
        actorRole: user.role,
        actorName: user.name || null,
        previousStatus,
        nextStatus,
        payload: {
          action,
          courierId: updatedOrder.courierId,
          paymentStatus: updatedOrder.paymentStatus,
        },
        message: eventMessage,
      })

      if (previousCourierId !== updatedOrder.courierId) {
        await appendOrderAudit(tx, {
          orderId: updatedOrder.id,
          eventType: updatedOrder.courierId
            ? OrderEventType.COURIER_ASSIGNED
            : OrderEventType.COURIER_UNASSIGNED,
          actorAdminId: user.id,
          actorRole: user.role,
          actorName: user.name || null,
          previousStatus,
          nextStatus,
          payload: {
            previousCourierId,
            nextCourierId: updatedOrder.courierId,
          },
          message: updatedOrder.courierId ? 'Courier assigned' : 'Courier unassigned',
        })
      }

      return updatedOrder
    })

    const transformedOrder = {
      ...updatedOrder,
      customerName: updatedOrder.customer?.name || 'Неизвестный клиент',
      customerPhone: updatedOrder.customer?.phone || 'Нет телефона',
      assignedSetId: updatedOrder.customer?.assignedSetId || null,
      assignedSetName: (updatedOrder.customer as any)?.assignedSet?.name || null,
      customer: {
        name: updatedOrder.customer?.name || 'Неизвестный клиент',
        phone: updatedOrder.customer?.phone || 'Нет телефона',
        assignedSetId: updatedOrder.customer?.assignedSetId || null,
        assignedSetName: (updatedOrder.customer as any)?.assignedSet?.name || null
      },
      deliveryDate: updatedOrder.deliveryDate ? new Date(updatedOrder.deliveryDate).toISOString().split('T')[0] : new Date(updatedOrder.createdAt).toISOString().split('T')[0],
      isAutoOrder: updatedOrder.fromAutoOrder,
      courierName: updatedOrder.courier?.name || null
    }

    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error('Error updating order:', error)

    if (error instanceof ConcurrentOrderUpdateError) {
      return NextResponse.json({ error: 'Заказ был изменён другим запросом. Обновите страницу и повторите действие.' }, { status: 409 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json({
          error: 'Указан неверный ID курьера или клиента'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }
    if (!hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { orderId } = await context.params

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            assignedSetId: true,
            assignedSet: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    // Authorization check: Verify user has permission to view this order
    if (user.role === 'LOW_ADMIN') {
      // LOW_ADMIN can only view orders within their owner group
      const groupAdminIds = await getGroupAdminIds(user)
      const inGroup = !!order.adminId && !!groupAdminIds && groupAdminIds.includes(order.adminId)
      if (!inGroup) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    } else if (user.role === 'MIDDLE_ADMIN') {
      // MIDDLE_ADMIN can view their orders and their low admins' orders
      const lowAdmins = await db.admin.findMany({
        where: { createdBy: user.id, role: 'LOW_ADMIN' },
        select: { id: true }
      })
      const allowedAdminIds = [user.id, ...lowAdmins.map(a => a.id)]

      if (!order.adminId || !allowedAdminIds.includes(order.adminId)) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    } else if (user.role === 'COURIER') {
      // Courier can only view orders assigned to them
      if (order.courierId !== user.id) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    }
    // SUPER_ADMIN can view all orders (no restriction)

    const transformedOrder = {
      ...order,
      customerName: order.customer?.name || 'Неизвестный клиент',
      customerPhone: order.customer?.phone || 'Нет телефона',
      assignedSetId: order.customer?.assignedSetId || null,
      assignedSetName: (order.customer as any)?.assignedSet?.name || null,
      customer: {
        name: order.customer?.name || 'Неизвестный клиент',
        phone: order.customer?.phone || 'Нет телефона',
        assignedSetId: order.customer?.assignedSetId || null,
        assignedSetName: (order.customer as any)?.assignedSet?.name || null
      },
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0],
      isAutoOrder: order.fromAutoOrder
    }

    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
