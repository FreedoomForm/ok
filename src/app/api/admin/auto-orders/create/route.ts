import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

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

    const { targetDate } = await request.json()
    // Start from provided date or tomorrow (since auto-orders are usually for future)
    // If targetDate is provided, use it. If not, start from tomorrow.
    const startDate = targetDate ? new Date(targetDate) : new Date()
    // Ensure we start from the beginning of the day
    startDate.setHours(0, 0, 0, 0)

    const defaultAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })
    if (!defaultAdmin) return NextResponse.json({ error: 'Администратор не найден' }, { status: 400 })

    const customers = await db.customer.findMany({ where: { isActive: true, deletedAt: null } })

    let totalCreated = 0
    const createdOrdersSummary: any[] = []

    // Loop for 30 days
    for (let i = 0; i < 30; i++) {
      const processDate = new Date(startDate)
      processDate.setDate(startDate.getDate() + i)

      const dayStart = startOfDay(processDate)
      const dayEnd = endOfDay(processDate)

      const dayOfWeek = processDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

      for (const c of customers) {
        // Check eligibility based on deliveryDays
        let deliveryDays: any = {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true
        }

        if ((c as any).deliveryDays) {
          try {
            // Handle if it's already an object or a string
            deliveryDays = typeof (c as any).deliveryDays === 'string'
              ? JSON.parse((c as any).deliveryDays)
              : (c as any).deliveryDays
          } catch (e) {
            // Fallback to defaults or log error
          }
        }

        // Skip if this day is not enabled
        if (!deliveryDays[dayOfWeek]) continue

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

        const lastOrder = await db.order.findFirst({ orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } })
        const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

        const createdOrder = await db.order.create({
          data: {
            orderNumber: nextOrderNumber,
            customerId: c.id,
            adminId: c.createdBy || defaultAdmin.id,
            deliveryAddress: c.address,
            deliveryDate: new Date(dayStart),
            deliveryTime: defaultDeliveryTime(),
            quantity: 1,
            calories: c.calories ?? 1600,
            specialFeatures: c.preferences || '',
            paymentStatus: 'UNPAID',
            paymentMethod: 'CASH',
            isPrepaid: false,
            orderStatus: 'PENDING',
            isAutoOrder: true // Mark as auto-order
          },
          include: { customer: { select: { name: true, phone: true } } }
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
      sampleOrders: createdOrdersSummary
    })
  } catch (error: any) {
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

    const todays = await db.order.findMany({
      where: { deliveryDate: { gte: dayStart, lte: dayEnd } },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    })

    const tomorrow = new Date(dayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const customers = await db.customer.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, phone: true, orderPattern: true } })
    const tomorrowEligible = customers.filter(c => isEligibleByPattern(c.orderPattern, tomorrow))

    return NextResponse.json({
      todayStats: {
        date: dayStart.toDateString(),
        autoOrdersCreated: todays.length,
        orders: todays.map(o => ({ id: o.id, customerName: o.customer?.name, customerPhone: o.customer?.phone, deliveryAddress: o.deliveryAddress, deliveryDate: o.deliveryDate?.toISOString().split('T')[0], deliveryTime: o.deliveryTime, isAutoOrder: true }))
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
