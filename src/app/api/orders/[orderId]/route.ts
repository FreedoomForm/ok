import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { OrderEventType, type OrderStatus, Prisma } from '@prisma/client'
import { appendOrderAudit, getCourierAssignmentPatch, getStatusTimestampPatch } from '@/lib/order-audit'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const { orderId } = await context.params
    const body = await request.json()
    const { action } = body

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

        const { amountReceived: amountReceivedDelta } = body
        updateData.orderStatus = 'DELIVERED'
        Object.assign(updateData, getStatusTimestampPatch('DELIVERED'))
        eventType = OrderEventType.DELIVERY_COMPLETED
        eventMessage = 'Delivery completed'

        const financeAdminId = await resolveFinanceAdminId()
        const transactionOps: Prisma.PrismaPromise<unknown>[] = []

        // 1. Deduct Daily Price (Expense)
        const dailyPrice = (order.customer as any)?.dailyPrice || 84000
        transactionOps.push(
          db.transaction.create({
            data: {
              amount: dailyPrice,
              type: 'EXPENSE',
              category: 'MEAL_DEDUCTION',
              description: `Списание за дневной рацион (Заказ #${order.orderNumber})`,
              adminId: financeAdminId,
              customerId: order.customerId
            }
          }),
          db.customer.update({
            where: { id: order.customerId },
            data: { balance: { decrement: dailyPrice } }
          })
        )

        // 2. Handle Payment (Income) if received
        const totalOrderCost = dailyPrice * (order.quantity || 1)
        const parsedDeltaRaw =
          amountReceivedDelta !== undefined &&
          amountReceivedDelta !== null &&
          String(amountReceivedDelta).trim() !== ''
            ? Number(amountReceivedDelta)
            : 0
        const parsedDelta = Number.isFinite(parsedDeltaRaw) ? parsedDeltaRaw : 0
        const delta = parsedDelta > 0 ? parsedDelta : 0

        const previousAmountReceived = typeof order.amountReceived === 'number' ? order.amountReceived : 0
        const nextAmountReceived = previousAmountReceived + delta

        if (delta > 0) {
          updateData.amountReceived = nextAmountReceived

          transactionOps.push(
            db.transaction.create({
              data: {
                amount: delta,
                type: 'INCOME',
                category: 'ORDER_PAYMENT',
                description: `Оплата за заказ #${order.orderNumber} (Курьер: ${(user as any).name || 'Unknown'})`,
                adminId: financeAdminId,
                customerId: order.customerId
              }
            }),
            db.customer.update({
              where: { id: order.customerId },
              data: { balance: { increment: delta } }
            }),
            db.admin.update({
              where: { id: financeAdminId },
              data: { companyBalance: { increment: delta } }
            })
          )
        } else if (previousAmountReceived > 0) {
          // Keep cumulative value on the order if it was already recorded earlier.
          updateData.amountReceived = previousAmountReceived
        }

        // 3. Update Payment Status based on received amount
        const effectiveReceived =
          typeof updateData.amountReceived === 'number' ? updateData.amountReceived : previousAmountReceived
        if (effectiveReceived >= totalOrderCost) {
          updateData.paymentStatus = 'PAID'
        } else if (!order.isPrepaid) {
          updateData.paymentStatus = 'UNPAID'
        }

        // Execute all balance updates transactionally
        if (transactionOps.length > 0) {
          await db.$transaction(transactionOps)
        }
        break
      case 'update_details':
        if (!hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
          return NextResponse.json({ error: 'Недостаточно прав для редактирования' }, { status: 403 })
        }

        const hasAssignedSetId = Object.prototype.hasOwnProperty.call(body, 'assignedSetId')
        const hasLatitude = Object.prototype.hasOwnProperty.call(body, 'latitude')
        const hasLongitude = Object.prototype.hasOwnProperty.call(body, 'longitude')
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
        } = body

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

          await db.customer.update({
            where: { id: order.customerId },
            data: { assignedSetId: sanitizedAssignedSetId }
          })
        }

        // Validate numeric fields if provided
        let parsedCalories
        if (calories !== undefined) {
          parsedCalories = parseInt(calories)
          if (isNaN(parsedCalories)) {
            return NextResponse.json({ error: 'Калории должны быть числом' }, { status: 400 })
          }
        }

        let parsedQuantity
        if (quantity !== undefined) {
          parsedQuantity = parseInt(quantity)
          if (isNaN(parsedQuantity)) {
            return NextResponse.json({ error: 'Количество должно быть числом' }, { status: 400 })
          }
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

        const hasAmountReceived = Object.prototype.hasOwnProperty.call(body, 'amountReceived')
        let nextAmountReceivedOverride: number | null | undefined = undefined

        if (hasAmountReceived) {
          const parsedRaw =
            amountReceived !== undefined && amountReceived !== null && String(amountReceived).trim() !== ''
              ? Number(amountReceived)
              : 0
          const parsed = Number.isFinite(parsedRaw) ? parsedRaw : 0
          nextAmountReceivedOverride = parsed > 0 ? parsed : null

          const previousValue = typeof order.amountReceived === 'number' ? order.amountReceived : 0
          const nextValue = typeof nextAmountReceivedOverride === 'number' ? nextAmountReceivedOverride : 0
          const delta = nextValue - previousValue

          if (delta !== 0) {
            const financeAdminId = await resolveFinanceAdminId()
            const txType = delta > 0 ? 'INCOME' : 'EXPENSE'
            const txAmount = Math.abs(delta)

            await db.$transaction([
              db.transaction.create({
                data: {
                  amount: txAmount,
                  type: txType,
                  category: 'ORDER_PAYMENT',
                  description: `Order payment adjustment (Order #${order.orderNumber})`,
                  adminId: financeAdminId,
                  customerId: order.customerId
                }
              }),
              db.customer.update({
                where: { id: order.customerId },
                data: { balance: { increment: delta } }
              }),
              db.admin.update({
                where: { id: financeAdminId },
                data: { companyBalance: { increment: delta } }
              })
            ])
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

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
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

    const nextStatus = updatedOrder.orderStatus as OrderStatus
    await appendOrderAudit(db, {
      orderId: updatedOrder.id,
      eventType,
      actorAdminId: user.id,
      actorRole: user.role,
      actorName: (user as any).name || null,
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
      await appendOrderAudit(db, {
        orderId: updatedOrder.id,
        eventType: updatedOrder.courierId
          ? OrderEventType.COURIER_ASSIGNED
          : OrderEventType.COURIER_UNASSIGNED,
        actorAdminId: user.id,
        actorRole: user.role,
        actorName: (user as any).name || null,
        previousStatus,
        nextStatus,
        payload: {
          previousCourierId,
          nextCourierId: updatedOrder.courierId,
        },
        message: updatedOrder.courierId ? 'Courier assigned' : 'Courier unassigned',
      })
    }

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
