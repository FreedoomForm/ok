import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client'
import { allocateOrderNumber } from '@/lib/orders/number'
import {
  autoOrderCreateSchema,
  buildAutoOrderCustomerWhere,
  isEligibleForDeliveryDay,
  parseDeliveryDaySchedule,
} from '@/lib/admin/auto-orders'

function isEligibleByPattern(orderPattern: string | null | undefined, date: Date) {
  const day = date.getDate()
  switch (orderPattern) {
    case 'every_other_day_even':
      return day % 2 === 0
    case 'every_other_day_odd':
      return day % 2 === 1
    case 'daily':
    default:
      return true
  }
}

function startOfDay(date: Date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function endOfDay(date: Date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d }
function defaultDeliveryTime(): string { const h = 11 + Math.floor(Math.random() * 3); const m = Math.floor(Math.random() * 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` }
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const parsedRequest = autoOrderCreateSchema.safeParse(body)
    if (!parsedRequest.success) {
      return NextResponse.json({ error: 'Некорректная дата автоматических заказов' }, { status: 400 })
    }

    // Preserve legacy behavior when targetDate is omitted.
    const startDate = parsedRequest.data.targetDate ? new Date(parsedRequest.data.targetDate) : new Date()
    // Ensure we start from the beginning of the day
    startDate.setHours(0, 0, 0, 0)

    // Robust default admin detection
    let defaultAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })
    if (!defaultAdmin) {
      // Fallback to current user if no super admin exists
      defaultAdmin = await db.admin.findUnique({ where: { id: user.id }, select: { id: true } })
    }

    // Last resort: any admin
    if (!defaultAdmin) {
      defaultAdmin = await db.admin.findFirst({ select: { id: true } })
    }

    if (!defaultAdmin) {
      return NextResponse.json({ error: 'Администратор не найден' }, { status: 400 })
    }

    let lowAdminIds: string[] = []
    if (user.role === 'MIDDLE_ADMIN') {
      const lowAdmins = await db.admin.findMany({
        where: { createdBy: user.id, role: 'LOW_ADMIN' },
        select: { id: true },
      })
      lowAdminIds = lowAdmins.map((admin) => admin.id)
    }

    const customers = await db.customer.findMany({
      where: buildAutoOrderCustomerWhere(user.role, user.id, lowAdminIds),
      select: {
        id: true,
        createdBy: true,
        address: true,
        latitude: true,
        longitude: true,
        calories: true,
        preferences: true,
        deliveryDays: true,
      },
    })

    let totalCreated = 0
    const totalFailed = 0
    const createdOrdersSummary: Array<{ id: string; customerName: string | undefined; date: string }> = []
    // Loop for 30 days
    for (let i = 0; i < 30; i++) {
      const processDate = new Date(startDate)
      processDate.setDate(startDate.getDate() + i)

      const dayStart = startOfDay(processDate)
      const dayEnd = endOfDay(processDate)

      for (const c of customers) {
        const deliveryDays = parseDeliveryDaySchedule(c.deliveryDays)

        // Skip if this day is not enabled.
        if (!isEligibleForDeliveryDay(deliveryDays, processDate)) continue

        // Check if order already exists
        // Check if order already exists
        const existing = await db.order.findFirst({
          where: { customerId: c.id, deliveryDate: { gte: dayStart, lte: dayEnd } },
          select: { id: true, adminId: true }
        })
        if (existing) {
          // Self-healing: If order exists but belongs to Super Admin (default) while client has a specific creator,
          // update the order to belong to the client's creator so it becomes visible to the Middle Admin.
          if (existing.adminId === defaultAdmin.id && c.createdBy && c.createdBy !== defaultAdmin.id) {
            await db.order.update({
              where: { id: existing.id },
              data: { adminId: c.createdBy }
            })
          }
          continue
        }

        const createdOrder = await db.$transaction(async (tx) => {
            const orderNumber = await allocateOrderNumber(tx)
            return tx.order.create({
              data: {
                orderNumber,
                customerId: c.id,
                adminId: c.createdBy || defaultAdmin.id,
                deliveryAddress: c.address,
                latitude: c.latitude ?? null,
                longitude: c.longitude ?? null,
                deliveryDate: new Date(dayStart),
                deliveryTime: defaultDeliveryTime(),
                quantity: 1,
                calories: c.calories ?? 1600,
                specialFeatures: c.preferences || '',
                paymentStatus: PaymentStatus.UNPAID,
                paymentMethod: PaymentMethod.CASH,
                isPrepaid: false,
                orderStatus: OrderStatus.NEW,
                fromAutoOrder: true // Mark as auto-order
              },
              include: { customer: { select: { name: true, phone: true } } }
            })
          })

        totalCreated++
        if (createdOrdersSummary.length < 50) { // Limit response size
          createdOrdersSummary.push({
            id: createdOrder.id,
            customerName: createdOrder.customer?.name,
            date: processDate.toISOString().split('T')[0]
          })
        }
      }
    }

    return NextResponse.json({
      message: `Автоматически создано ${totalCreated} заказов на 30 дней`,
      startDate: startDate.toDateString(),
      createdCount: totalCreated,
      failedCount: totalFailed,
      sampleOrders: createdOrdersSummary
    })
  } catch (error) {
    console.error('Error creating auto orders:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const target = dateParam ? new Date(dateParam) : new Date()
    const dayStart = startOfDay(target)
    const dayEnd = endOfDay(target)
    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    const todays = await db.order.findMany({
      where: {
        deliveryDate: { gte: dayStart, lte: dayEnd },
        ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {}),
      },
      select: {
        id: true,
        deliveryAddress: true,
        deliveryDate: true,
        deliveryTime: true,
        fromAutoOrder: true,
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' }
    })

    const tomorrow = new Date(dayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const customers = await db.customer.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        autoOrdersEnabled: true,
        ...(groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}),
      },
      select: { id: true, name: true, phone: true, orderPattern: true },
    })
    const tomorrowEligible = customers.filter(c => isEligibleByPattern(c.orderPattern, tomorrow))

    return NextResponse.json({
      todayStats: {
        date: dayStart.toDateString(),
        autoOrdersCreated: todays.length,
        orders: todays.map(o => ({ id: o.id, customerName: o.customer?.name, customerPhone: o.customer?.phone, deliveryAddress: o.deliveryAddress, deliveryDate: o.deliveryDate?.toISOString().split('T')[0], deliveryTime: o.deliveryTime, isAutoOrder: o.fromAutoOrder }))
      },
      tomorrowPreview: { date: tomorrow.toDateString(), eligibleClients: tomorrowEligible.length, clients: tomorrowEligible }
    })
  } catch (error) {
    console.error('Error getting auto orders stats:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
