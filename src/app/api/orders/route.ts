import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { Prisma, PaymentStatus, PaymentMethod, OrderStatus, OrderEventType } from '@prisma/client'
import { appendOrderAudit } from '@/lib/order-audit'

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
    const filtersParam = searchParams.get('filters')
    let filters: any = {}
    if (filtersParam) {
      try { filters = JSON.parse(filtersParam) } catch (error) { console.error('Error parsing filters:', error) }
    }

    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const deletedOnly = searchParams.get('deletedOnly') === 'true'

    const whereClause: any = {}
    if (deletedOnly) {
      whereClause.deletedAt = { not: null }
    } else if (!includeDeleted) {
      whereClause.deletedAt = null
    }

    // Data isolation: Different isolation rules for each role
    if (user.role === 'MIDDLE_ADMIN') {
      // Get all low admins created by this middle admin
      const lowAdmins = await db.admin.findMany({
        where: {
          createdBy: user.id,
          role: 'LOW_ADMIN'
        },
        select: { id: true }
      })
      const lowAdminIds = lowAdmins.map(admin => admin.id)

      // Filter orders: only those created by this middle admin or their low admins
      whereClause.adminId = {
        in: [user.id, ...lowAdminIds]
      }
    } else if (user.role === 'LOW_ADMIN') {
      // LOW_ADMIN sees orders for their owner group (parent middle admin + all its low admins)
      const groupAdminIds = await getGroupAdminIds(user)
      whereClause.adminId = { in: groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id] }
    }
    // SUPER_ADMIN and COURIER see orders based on other filters (no admin restriction)

    const orders = await db.order.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' }
    })

    let filteredOrders = orders
    if (user.role === 'COURIER') {
      const today = new Date().toISOString().split('T')[0]
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0]
        return orderDate === today && order.courierId === user.id
      })
    } else {
      if (date) {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0]
          return orderDate === date
        })
      } else if (from || to) {
        const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
        const fromIso = from && isIsoDate(from) ? from : null
        const toIso = to && isIsoDate(to) ? to : null

        if (fromIso || toIso) {
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = order.deliveryDate
              ? new Date(order.deliveryDate).toISOString().split('T')[0]
              : new Date(order.createdAt).toISOString().split('T')[0]

            if (fromIso && orderDate < fromIso) return false
            if (toIso && orderDate > toIso) return false
            return true
          })
        }
      }
      if (Object.keys(filters).length > 0) {
        filteredOrders = filteredOrders.filter(order => {
          // Group filters by category
          const deliveryStatusFilters: string[] = []
          if (filters.successful) deliveryStatusFilters.push('DELIVERED')
          if (filters.failed) deliveryStatusFilters.push('FAILED')
          if (filters.pending) deliveryStatusFilters.push('PENDING')
          if (filters.inDelivery) deliveryStatusFilters.push('IN_DELIVERY')

          const paymentStatusFilters: string[] = []
          if (filters.paid) paymentStatusFilters.push('PAID')
          if (filters.unpaid) paymentStatusFilters.push('UNPAID')

          const paymentMethodFilters: string[] = []
          if (filters.card) paymentMethodFilters.push('CARD')
          if (filters.cash) paymentMethodFilters.push('CASH')

          const calorieFilters: number[] = []
          if (filters.calories1200) calorieFilters.push(1200)
          if (filters.calories1600) calorieFilters.push(1600)
          if (filters.calories2000) calorieFilters.push(2000)
          if (filters.calories2500) calorieFilters.push(2500)
          if (filters.calories3000) calorieFilters.push(3000)

          const orderTypeFilters: boolean[] = []
          if (filters.autoOrders) orderTypeFilters.push(true)
          if (filters.manualOrders) orderTypeFilters.push(false)

          const quantityFilters: string[] = []
          if (filters.singleItem) quantityFilters.push('single')
          if (filters.multiItem) quantityFilters.push('multi')

          // Apply grouped logic (OR within category, AND between categories)

          // Delivery Status
          if (deliveryStatusFilters.length > 0 && !deliveryStatusFilters.includes(order.orderStatus)) return false

          // Payment Status
          if (paymentStatusFilters.length > 0 && !paymentStatusFilters.includes(order.paymentStatus)) return false

          // Payment Method
          if (paymentMethodFilters.length > 0 && !paymentMethodFilters.includes(order.paymentMethod)) return false

          // Calorie Group
          if (calorieFilters.length > 0 && !calorieFilters.includes(order.calories)) return false

          // Order Type
          if (orderTypeFilters.length > 0 && !orderTypeFilters.includes(order.fromAutoOrder)) return false

          // Quantity
          if (quantityFilters.length > 0) {
            const isSingle = order.quantity === 1
            const matches = (quantityFilters.includes('single') && isSingle) || (quantityFilters.includes('multi') && !isSingle)
            if (!matches) return false
          }

          // Special filters (Prepaid, etc - these remain as AND for now or can be added to categories)
          if (filters.prepaid && !order.isPrepaid) return false

          return true
        })
      }
    }

    const transformedOrders = filteredOrders.map(order => ({
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

    return NextResponse.json(transformedOrders)
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
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN', 'COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const hasAssignedSetId = Object.prototype.hasOwnProperty.call(body, 'assignedSetId')
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
    } = body

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
    const parsedCalories = parseInt(calories)
    if (isNaN(parsedCalories)) {
      return NextResponse.json({ error: 'Калории должны быть числом' }, { status: 400 })
    }

    const parsedQuantity = quantity ? parseInt(quantity) : 1
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

    let customer: any | null = null
    if (selectedClientId && selectedClientId !== 'manual') {
      customer = await db.customer.findFirst({
        where: {
          id: selectedClientId,
          deletedAt: null,
          ...(allowedCustomerCreatorIds ? { createdBy: { in: allowedCustomerCreatorIds } } : {})
        }
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
        }
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
          }
        })
      }
    }

    if (hasAssignedSetId) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { assignedSetId: sanitizedAssignedSetId }
      })
    }

    const parsedAmountReceivedRaw =
      amountReceived !== undefined && amountReceived !== null && String(amountReceived).trim() !== ''
        ? Number(amountReceived)
        : 0
    const parsedAmountReceived = Number.isFinite(parsedAmountReceivedRaw) ? parsedAmountReceivedRaw : 0
    const normalizedAmountReceived = parsedAmountReceived > 0 ? parsedAmountReceived : 0

    const customerDailyPrice = (customer as any)?.dailyPrice || 84000
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

    const getNextOrderNumber = async () => {
      const lastOrder = await db.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true }
      })
      return lastOrder ? lastOrder.orderNumber + 1 : 1
    }

    const resolvedCourierId = sanitizedCourierId || (customer as any).defaultCourierId || null

    let newOrder: any | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const nextOrderNumber = await getNextOrderNumber()
      try {
        newOrder = await db.order.create({
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
            longitude: sanitizedLongitude
          },
          include: orderInclude
        })
        break
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue
        }
        throw error
      }
    }

    if (!newOrder) {
      return NextResponse.json({ error: 'Не удалось сгенерировать номер заказа' }, { status: 500 })
    }

    await appendOrderAudit(db, {
      orderId: newOrder.id,
      eventType: OrderEventType.CREATED,
      actorAdminId: user.id,
      actorRole: user.role,
      actorName: (user as any).name || null,
      nextStatus: newOrder.orderStatus,
      payload: {
        sourceChannel: sourceChannel ? String(sourceChannel) : 'ADMIN_PANEL',
        priority: parsedPriority,
      },
      message: 'Order created',
    })

    if (normalizedAmountReceived > 0) {
      try {
        await db.$transaction([
          db.transaction.create({
            data: {
              amount: normalizedAmountReceived,
              type: 'INCOME',
              category: 'ORDER_PAYMENT',
              description: `Order payment (Order #${newOrder.orderNumber})`,
              adminId: financeAdminId,
              customerId: customer.id,
            },
          }),
          db.customer.update({
            where: { id: customer.id },
            data: { balance: { increment: normalizedAmountReceived } },
          }),
          db.admin.update({
            where: { id: financeAdminId },
            data: { companyBalance: { increment: normalizedAmountReceived } },
          }),
        ])
      } catch (error) {
        console.error('Error recording order payment on create:', error)
        // Keep system consistent: if we couldn't write finance changes, clear amountReceived.
        try {
          await db.order.update({
            where: { id: newOrder.id },
            data: { amountReceived: null, paymentStatus: PaymentStatus.UNPAID },
          })
        } catch {
          // ignore rollback failures
        }
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
      }
    }

    if (resolvedCourierId) {
      await appendOrderAudit(db, {
        orderId: newOrder.id,
        eventType: OrderEventType.COURIER_ASSIGNED,
        actorAdminId: user.id,
        actorRole: user.role,
        actorName: (user as any).name || null,
        nextStatus: newOrder.orderStatus,
        payload: { courierId: resolvedCourierId },
        message: 'Courier assigned on create',
      })
    }

    const transformedOrder = {
      ...newOrder,
      customerName: newOrder.customer?.name || customerName,
      customerPhone: newOrder.customer?.phone || customerPhone,
      deliveryDate: date || new Date(newOrder.createdAt).toISOString().split('T')[0],
      isAutoOrder: false,
      latitude: latitude ? parseFloat(String(latitude)) : null,
      longitude: longitude ? parseFloat(String(longitude)) : null,
      assignedSetId: newOrder.customer?.assignedSetId || null,
      assignedSetName: (newOrder.customer as any)?.assignedSet?.name || null
    }

    console.log(`✅ Created manual order: ${transformedOrder.customerName} (#${newOrder.orderNumber})`)

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
