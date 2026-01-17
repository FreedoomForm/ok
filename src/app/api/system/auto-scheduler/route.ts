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
function defaultDeliveryTime(): string { const h = 11 + Math.floor(Math.random() * 3); const m = Math.floor(Math.random() * 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ` }

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    // Check for cron token or admin request
    const cronToken = request.headers.get('X-Cron-Token')
    const isCronRequest = cronToken === process.env.CRON_SECRET_TOKEN

    if (!isCronRequest) {
      if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const processDate = dateParam ? new Date(dateParam) : new Date()

    // If it's a cron request, we might want to process for tomorrow if it's late in the day
    // But for now let's stick to the requested date or today

    const dayStart = startOfDay(processDate)
    const dayEnd = endOfDay(processDate)

    const customers = await db.customer.findMany({ where: { isActive: true } })
    const defaultAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })

    // If no super admin, try to find any admin or use a system ID if possible (but schema likely requires valid adminId)
    // For now, fail if no admin found
    if (!defaultAdmin) {
      console.error('No SUPER_ADMIN found for auto-scheduler')
      return NextResponse.json({ error: 'System configuration error' }, { status: 500 })
    }

    const eligible = customers.filter(c => isEligibleByPattern(c.orderPattern, processDate))

    let created = 0
    const createdOrders: any[] = []

    for (const c of eligible) {
      // Check if order already exists for this date
      const existing = await db.order.findFirst({
        where: { customerId: c.id, deliveryDate: { gte: dayStart, lte: dayEnd } },
        select: { id: true }
      })
      if (existing) continue

      const lastOrder = await db.order.findFirst({ orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } })
      const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

      const createdOrder = await db.order.create({
        data: {
          orderNumber: nextOrderNumber,
          customerId: c.id,
          adminId: defaultAdmin.id,
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
        },
        include: { customer: { select: { name: true, phone: true } } }
      })

      created++
      createdOrders.push({
        id: createdOrder.id,
        customerName: createdOrder.customer?.name,
        customerPhone: createdOrder.customer?.phone,
        deliveryAddress: createdOrder.deliveryAddress,
        deliveryDate: createdOrder.deliveryDate?.toISOString().split('T')[0],
        deliveryTime: createdOrder.deliveryTime,
        calories: createdOrder.calories,
        paymentStatus: createdOrder.paymentStatus,
        orderStatus: createdOrder.orderStatus,
        isAutoOrder: true,
        createdAt: createdOrder.createdAt
      })
    }

    return NextResponse.json({
      message: `Автоматически создано ${created} заказов`,
      processedDate: processDate.toDateString(),
      eligibleClients: eligible.length,
      createdOrders: createdOrders.length,
      orders: createdOrders,
      isCronRequest
    })

  } catch (error: any) {
    console.error('Error in auto-scheduler:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
