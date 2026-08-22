import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { Prisma, PaymentStatus, PaymentMethod, OrderStatus, OrderEventType } from '@prisma/client'
import { appendOrderAudit } from '@/lib/order-audit'
import { buildOrderWhere, parseOrderFilters } from '@/lib/orders/query'
import { parseOrderPagination } from '@/lib/orders/pagination'
import { allocateOrderNumber } from '@/lib/orders/number'
import { parseOrderCreateRequest } from '@/lib/orders/create'

const orderCustomerSelect = {
  id: true,
  dailyPrice: true,
  defaultCourierId: true,
} as const

type OrderCustomer = Prisma.CustomerGetPayload<{ select: typeof orderCustomerSelect }>

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const filters = parseOrderFilters(searchParams.get('filters'))
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const deletedOnly = searchParams.get('deletedOnly') === 'true'
    const pagination = parseOrderPagination(searchParams.get('limit'), searchParams.get('offset'))

    const groupAdminIds =
      user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN'
        ? await getGroupAdminIds(user)
        : null

    const where = buildOrderWhere({
      role: user.role,
      userId: user.id,
      groupAdminIds,
      date,
      from,
      to,
      filters,
      includeDeleted,
      deletedOnly,
    })
    const orderQuery = {
      where,
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
      },
      orderBy: { createdAt: 'desc' },
      ...(pagination ? { take: pagination.limit, skip: pagination.offset } : {}),
    } satisfies Prisma.OrderFindManyArgs
    const [orders, total] = await Promise.all([
      db.order.findMany(orderQuery),
      pagination ? db.order.count({ where }) : Promise.resolve(null),
    ])

    const transformedOrders = orders.map(order => ({
      ...order,
      orderStatus: order.orderStatus,
      isAutoOrder: order.fromAutoOrder,
      customerName: order.customer?.name || 'Неизвестный клиент',
      customerPhone: order.customer?.phone || 'Нет телефона',
      assignedSetId: order.customer?.assignedSetId || null,
      assignedSetName: order.customer?.assignedSet?.name || null,
      customer: {
        name: order.customer?.name || 'Неизвестный клиент',
        phone: order.customer?.phone || 'Нет телефона',
        assignedSetId: order.customer?.assignedSetId || null,
        assignedSetName: order.customer?.assignedSet?.name || null
      },
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0],
      courierName: order.courier?.name || null
    }))

    const headers = new Headers()
    if (pagination && total !== null) {
      headers.set('X-Orders-Total', String(total))
      headers.set('X-Orders-Offset', String(pagination.offset))
      headers.set('X-Orders-Limit', String(pagination.limit))
      headers.set('X-Orders-Has-More', String(pagination.offset + orders.length < total))
    }

    return NextResponse.json(transformedOrders, { headers })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const validation = parseOrderCreateRequest(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Некорректные данные заказа' }, { status: 400 })
    }

    const hasAssignedSetId = typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'assignedSetId')
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
      amountReceived,
      date,
      selectedClientId,
      courierId,
      latitude,
      longitude,
      priority,
      sourceChannel,
      etaMinutes,
      routeDistanceKm,
      routeDurationMin,
      sequenceInRoute,
      assignedSetId: rawAssignedSetId
    } = validation.data

    const sanitizedAssignedSetId =
      rawAssignedSetId === '' || rawAssignedSetId === 'null' || rawAssignedSetId === undefined
        ? null
        : String(rawAssignedSetId)

    if (!customerName || !customerPhone || !deliveryAddress || !calories) {
      return NextResponse.json({ error: 'Не все обязательные поля заполнены' }, { status: 400 })
    }

    // Validate phone number
    if (customerPhone.length < 10 || customerPhone.length > 15) {
      return NextResponse.json({ error: 'Неверный формат номера телефона' }, { status: 400 })
    }

    // Validate numeric fields
    const parsedCalories = parseInt(String(calories), 10)
    if (isNaN(parsedCalories)) {
      return NextResponse.json({ error: 'Калории должны быть числом' }, { status: 400 })
    }

    const parsedQuantity = quantity ? parseInt(String(quantity), 10) : 1
    if (isNaN(parsedQuantity)) {
      return NextResponse.json({ error: 'Количество должно быть числом' }, { status: 400 })
    }

    const parsedPriority =
      priority !== undefined && priority !== null && priority !== ''
        ? Math.min(5, Math.max(1, Number(priority)))
        : 3
    const parsedEtaMinutes =
      etaMinutes !== undefined && etaMinutes !== null && etaMinutes !== ''
        ? Number(etaMinutes)
        : null
    const parsedRouteDistanceKm =
      routeDistanceKm !== undefined && routeDistanceKm !== null && routeDistanceKm !== ''
        ? Number(routeDistanceKm)
        : null
    const parsedRouteDurationMin =
      routeDurationMin !== undefined && routeDurationMin !== null && routeDurationMin !== ''
        ? Number(routeDurationMin)
        : null
    const parsedSequenceInRoute =
      sequenceInRoute !== undefined && sequenceInRoute !== null && sequenceInRoute !== ''
        ? Number(sequenceInRoute)
        : null

    // Validate date
    if (date && isNaN(Date.parse(date))) {
      return NextResponse.json({ error: 'Неверный формат даты' }, { status: 400 })
    }

    // Validate enums early to avoid Prisma throwing internal errors
    if (paymentStatus && !['PAID', 'UNPAID', 'PARTIAL'].includes(String(paymentStatus))) {
      return NextResponse.json({ error: 'Неверный статус оплаты' }, { status: 400 })
    }
    if (paymentMethod && !['CASH', 'CARD', 'TRANSFER'].includes(String(paymentMethod))) {
      return NextResponse.json({ error: 'Неверный способ оплаты' }, { status: 400 })
    }

    // Sanitize courierId
    const sanitizedCourierId = (courierId === '' || courierId === 'null') ? null : courierId

    // Validate and sanitize coordinates
    let sanitizedLatitude: number | null = null
    let sanitizedLongitude: number | null = null

    if (latitude !== undefined && latitude !== null && latitude !== '') {
      const lat = parseFloat(String(latitude))
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        sanitizedLatitude = lat
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== '') {
      const lng = parseFloat(String(longitude))
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        sanitizedLongitude = lng
      }
    }

    const ownerAdminId = await getOwnerAdminId(user)
    const financeAdminId = ownerAdminId ?? user.id
    const groupAdminIds =
      user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN'
        ? await getGroupAdminIds(user)
        : null

    if (hasAssignedSetId && sanitizedAssignedSetId && user.role !== 'SUPER_ADMIN') {
      if (!ownerAdminId) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      }
      const set = await db.menuSet.findFirst({
        where: { id: sanitizedAssignedSetId, adminId: ownerAdminId },
        select: { id: true }
      })
      if (!set) {
        return NextResponse.json({ error: 'Указан неверный сет' }, { status: 400 })
      }
    }

    const allowedCustomerCreatorIds = groupAdminIds

    let customer: OrderCustomer | null = null
    if (selectedClientId && selectedClientId !== 'manual') {
      customer = await db.customer.findFirst({
        where: {
          id: selectedClientId,
          deletedAt: null,
          ...(allowedCustomerCreatorIds ? { createdBy: { in: allowedCustomerCreatorIds } } : {})
        },
        select: orderCustomerSelect,
      })
      if (!customer) {
        return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
      }
    } else {
      customer = await db.customer.findFirst({
        where: {
          phone: customerPhone,
          deletedAt: null,
          ...(allowedCustomerCreatorIds ? { createdBy: { in: allowedCustomerCreatorIds } } : {})
        },
        select: orderCustomerSelect,
      })
      if (!customer) {
        // Create new customer as inactive for one-time orders
        customer = await db.customer.create({
          data: {
            name: customerName,
            phone: customerPhone,
            address: deliveryAddress,
            preferences: specialFeatures,
            orderPattern: 'manual',
            isActive: false,  // One-time order - client is disabled by default
            latitude: sanitizedLatitude,
            longitude: sanitizedLongitude,
            assignedSetId: hasAssignedSetId ? sanitizedAssignedSetId : null,
            createdBy: (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') ? user.id : null
          },
          select: orderCustomerSelect,
        })
      }
    }

    if (hasAssignedSetId) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { assignedSetId: sanitizedAssignedSetId },
        select: orderCustomerSelect,
      })
    }

    const parsedAmountReceivedRaw =
      amountReceived !== undefined && amountReceived !== null && String(amountReceived).trim() !== ''
        ? Number(amountReceived)
        : 0
    const parsedAmountReceived = Number.isFinite(parsedAmountReceivedRaw) ? parsedAmountReceivedRaw : 0
    const normalizedAmountReceived = parsedAmountReceived > 0 ? parsedAmountReceived : 0

    const customerDailyPrice = customer.dailyPrice || 84000
    const totalOrderCost = customerDailyPrice * parsedQuantity
    const resolvedPaymentStatus: PaymentStatus =
      paymentStatus
        ? (String(paymentStatus) as PaymentStatus)
        : normalizedAmountReceived >= totalOrderCost
          ? PaymentStatus.PAID
          : normalizedAmountReceived > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.UNPAID

    const orderInclude = {
      customer: {
        select: {
          name: true,
          phone: true,
          assignedSetId: true,
          assignedSet: { select: { id: true, name: true } }
        }
      },
      courier: { select: { id: true, name: true } }
    } as const

    const resolvedCourierId = sanitizedCourierId || customer.defaultCourierId || null

    const newOrder = await db.$transaction(async (tx) => {
          const nextOrderNumber = await allocateOrderNumber(tx)
          const createdOrder = await tx.order.create({
            data: {
              orderNumber: nextOrderNumber,
              customerId: customer.id,
              adminId: user.id,
              courierId: resolvedCourierId,
              deliveryAddress,
              deliveryDate: date ? new Date(date) : null,
              deliveryTime: deliveryTime || '12:00',
              quantity: parsedQuantity,
              calories: parsedCalories,
              specialFeatures: specialFeatures || '',
              paymentStatus: resolvedPaymentStatus,
              paymentMethod: (paymentMethod ? String(paymentMethod) : PaymentMethod.CASH) as PaymentMethod,
              isPrepaid: isPrepaid || false,
              amountReceived: normalizedAmountReceived > 0 ? normalizedAmountReceived : null,
              orderStatus: OrderStatus.NEW,
              sourceChannel: sourceChannel ? String(sourceChannel) : 'ADMIN_PANEL',
              priority: parsedPriority,
              etaMinutes: Number.isFinite(parsedEtaMinutes ?? NaN) ? parsedEtaMinutes : null,
              routeDistanceKm: Number.isFinite(parsedRouteDistanceKm ?? NaN) ? parsedRouteDistanceKm : null,
              routeDurationMin: Number.isFinite(parsedRouteDurationMin ?? NaN) ? parsedRouteDurationMin : null,
              sequenceInRoute: Number.isFinite(parsedSequenceInRoute ?? NaN) ? parsedSequenceInRoute : null,
              statusChangedAt: new Date(),
              assignedAt: resolvedCourierId ? new Date() : null,
              latitude: sanitizedLatitude,
              longitude: sanitizedLongitude,
            },
            include: orderInclude,
          })

          await appendOrderAudit(tx, {
            orderId: createdOrder.id,
            eventType: OrderEventType.CREATED,
            actorAdminId: user.id,
            actorRole: user.role,
            actorName: user.name || null,
            nextStatus: createdOrder.orderStatus,
            payload: {
              sourceChannel: sourceChannel ? String(sourceChannel) : 'ADMIN_PANEL',
              priority: parsedPriority,
            },
            message: 'Order created',
          })

          if (normalizedAmountReceived > 0) {
            await tx.transaction.create({
              data: {
                amount: normalizedAmountReceived,
                type: 'INCOME',
                category: 'ORDER_PAYMENT',
                description: `Order payment (Order #${createdOrder.orderNumber})`,
                adminId: financeAdminId,
                customerId: customer.id,
              },
            })
            await tx.customer.update({
              where: { id: customer.id },
              data: { balance: { increment: normalizedAmountReceived } },
            })
            await tx.admin.update({
              where: { id: financeAdminId },
              data: { companyBalance: { increment: normalizedAmountReceived } },
            })
          }

          if (resolvedCourierId) {
            await appendOrderAudit(tx, {
              orderId: createdOrder.id,
              eventType: OrderEventType.COURIER_ASSIGNED,
              actorAdminId: user.id,
              actorRole: user.role,
              actorName: user.name || null,
              nextStatus: createdOrder.orderStatus,
              payload: { courierId: resolvedCourierId },
              message: 'Courier assigned on create',
            })
          }

          return createdOrder
        })

    const transformedOrder = {
      ...newOrder,
      customerName: newOrder.customer?.name || customerName,
      customerPhone: newOrder.customer?.phone || customerPhone,
      deliveryDate: date || new Date(newOrder.createdAt).toISOString().split('T')[0],
      isAutoOrder: false,
      latitude: latitude ? parseFloat(String(latitude)) : null,
      longitude: longitude ? parseFloat(String(longitude)) : null,
      assignedSetId: newOrder.customer?.assignedSetId || null,
      assignedSetName: newOrder.customer?.assignedSet?.name || null
    }

    return NextResponse.json({ message: 'Заказ успешно создан', order: transformedOrder })

  } catch (error) {
    console.error('Error creating order:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({
          error: 'Заказ с таким номером уже существует'
        }, { status: 409 })
      }
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
