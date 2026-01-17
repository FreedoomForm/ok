import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const { orderId } = params
    const body = await request.json()
    const { action } = body

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { name: true, phone: true, dailyPrice: true } } }
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    // Authorization check: Verify user has permission to modify this order
    if (user.role === 'LOW_ADMIN') {
      // LOW_ADMIN can only modify their own orders
      if (order.adminId !== user.id && action !== 'start_delivery') {
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

        if (!allowedAdminIds.includes(order.adminId)) {
          return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }
      }
    } else if (user.role === 'COURIER' && action !== 'start_delivery' && action !== 'pause_delivery' && action !== 'resume_delivery' && action !== 'complete_delivery') {
      // Courier can only perform delivery-related actions on their own orders
      if (order.courierId !== user.id) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    }
    // SUPER_ADMIN can modify all orders (no restriction)

    let updateData: any = {}

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
        break
      case 'pause_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может приостановить доставку' }, { status: 403 })
        }
        if (order.orderStatus !== 'IN_DELIVERY') {
          return NextResponse.json({ error: 'Можно приостановить только активную доставку' }, { status: 400 })
        }
        updateData.orderStatus = 'PAUSED'
        break
      case 'resume_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может возобновить доставку' }, { status: 403 })
        }
        if (order.orderStatus !== 'PAUSED') {
          return NextResponse.json({ error: 'Можно возобновить только приостановленную доставку' }, { status: 400 })
        }
        updateData.orderStatus = 'IN_DELIVERY'
        break
      case 'complete_delivery':
        if (!hasRole(user, ['COURIER'])) {
          return NextResponse.json({ error: 'Только курьер может завершить доставку' }, { status: 403 })
        }

        if (order.orderStatus === 'DELIVERED') {
          return NextResponse.json({ error: 'Заказ уже доставлен' }, { status: 400 })
        }

        const { amountReceived } = body
        updateData.orderStatus = 'DELIVERED'
        updateData.deliveredAt = new Date()

        const transactionOps = []

        // 1. Deduct Daily Price (Expense)
        const dailyPrice = (order.customer as any)?.dailyPrice || 84000
        transactionOps.push(
          db.transaction.create({
            data: {
              amount: dailyPrice,
              type: 'EXPENSE',
              category: 'MEAL_DEDUCTION',
              description: `Списание за дневной рацион (Заказ #${order.orderNumber})`,
              adminId: order.adminId,
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
        const parsedAmount = amountReceived !== undefined && amountReceived !== null ? parseFloat(amountReceived) : 0

        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          updateData.amountReceived = parsedAmount

          transactionOps.push(
            db.transaction.create({
              data: {
                amount: parsedAmount,
                type: 'INCOME',
                category: 'ORDER_PAYMENT',
                description: `Оплата за заказ #${order.orderNumber} (Курьер: ${(user as any).name || 'Unknown'})`,
                adminId: order.adminId,
                customerId: order.customerId
              }
            }),
            db.customer.update({
              where: { id: order.customerId },
              data: { balance: { increment: parsedAmount } }
            }),
            db.admin.update({
              where: { id: order.adminId },
              data: { companyBalance: { increment: parsedAmount } }
            })
          )
        }

        // 3. Update Payment Status based on received amount
        if (parsedAmount >= totalOrderCost) {
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
        if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
          return NextResponse.json({ error: 'Недостаточно прав для редактирования' }, { status: 403 })
        }

        const {
          customerName,
          customerPhone,
          deliveryAddress,
          deliveryTime,
          quantity,
          calories,
          specialFeatures,
          paymentStatus,
          paymentMethod,
          isPrepaid,
          date,
          courierId
        } = body

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

        // Update customer info if name/phone changed and it's a manual order or we want to update the linked customer
        // For now, we'll just update the order fields. Updating the customer entity is a separate concern.

        updateData = {
          ...updateData,
          deliveryAddress,
          deliveryTime,
          quantity: parsedQuantity,
          calories: parsedCalories,
          specialFeatures,
          paymentStatus,
          paymentMethod,
          isPrepaid,
          deliveryDate: date ? new Date(date) : undefined,
          courierId: (courierId === 'null' || courierId === '') ? null : courierId
        }
        break
      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true } },
        courier: { select: { id: true, name: true } }
      }
    })

    const transformedOrder = {
      ...updatedOrder,
      customerName: updatedOrder.customer?.name || 'Неизвестный клиент',
      customerPhone: updatedOrder.customer?.phone || 'Нет телефона',
      customer: { name: updatedOrder.customer?.name || 'Неизвестный клиент', phone: updatedOrder.customer?.phone || 'Нет телефона' },
      deliveryDate: updatedOrder.deliveryDate ? new Date(updatedOrder.deliveryDate).toISOString().split('T')[0] : new Date(updatedOrder.createdAt).toISOString().split('T')[0],
      isAutoOrder: updatedOrder.isAutoOrder,
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
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const { orderId } = params

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { name: true, phone: true } } }
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    // Authorization check: Verify user has permission to view this order
    if (user.role === 'LOW_ADMIN') {
      // LOW_ADMIN can only view their own orders
      if (order.adminId !== user.id) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
    } else if (user.role === 'MIDDLE_ADMIN') {
      // MIDDLE_ADMIN can view their orders and their low admins' orders
      const lowAdmins = await db.admin.findMany({
        where: { createdBy: user.id, role: 'LOW_ADMIN' },
        select: { id: true }
      })
      const allowedAdminIds = [user.id, ...lowAdmins.map(a => a.id)]

      if (!allowedAdminIds.includes(order.adminId)) {
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
      customer: { name: order.customer?.name || 'Неизвестный клиент', phone: order.customer?.phone || 'Нет телефона' },
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0],
      isAutoOrder: order.isAutoOrder
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
