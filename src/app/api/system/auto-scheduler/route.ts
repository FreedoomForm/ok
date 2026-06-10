import { createApiRoute, createPublicApiRoute } from '@/modules/shared/http'
import { BadRequestError, ForbiddenError, InternalError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { OrderStatus } from '@prisma/client'

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

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
function defaultDeliveryTime(): string {
  const h = 11 + Math.floor(Math.random() * 3)
  const m = Math.floor(Math.random() * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Handles the auto-scheduler logic for both authenticated admins and cron requests.
 * Cron requests bypass auth by providing X-Cron-Token header.
 */
async function handleAutoScheduler(
  request: Request,
  user?: { id: string; role: string } | null,
) {
  const cronToken = request.headers.get('X-Cron-Token')
  const isCronRequest = cronToken === process.env.CRON_SECRET_TOKEN

  if (!isCronRequest) {
    if (!user || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role)) {
      throw new ForbiddenError('Доступ запрещен')
    }
  }

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  const processDate = dateParam ? new Date(dateParam) : new Date()

  const dayStart = startOfDay(processDate)
  const dayEnd = endOfDay(processDate)

  const customers = await db.customer.findMany({
    where: { isActive: true, autoOrdersEnabled: true },
  })
  const defaultAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })

  if (!defaultAdmin) {
    throw new InternalError('No SUPER_ADMIN found for auto-scheduler')
  }

  const eligible = customers.filter((c) => isEligibleByPattern(c.orderPattern, processDate))

  let created = 0
  const createdOrders: unknown[] = []

  for (const c of eligible) {
    const existing = await db.order.findFirst({
      where: { customerId: c.id, deliveryDate: { gte: dayStart, lte: dayEnd } },
      select: { id: true },
    })
    if (existing) continue

    const lastOrder = await db.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
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
        orderStatus: 'NEW',
      },
      include: { customer: { select: { name: true, phone: true } } },
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
      createdAt: createdOrder.createdAt,
    })
  }

  return {
    data: {
      message: `Автоматически создано ${created} заказов`,
      processedDate: processDate.toDateString(),
      eligibleClients: eligible.length,
      createdOrders: createdOrders.length,
      orders: createdOrders,
      isCronRequest,
    },
  }
}

/**
 * Cron-compatible public route — cron requests use X-Cron-Token header.
 */
export const GET = createPublicApiRoute(async ({ request }) => {
  return handleAutoScheduler(request, null)
})

/**
 * Authenticated admin route — admins call directly with session.
 */
export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN'],
  handler: async ({ request, user }) => {
    return handleAutoScheduler(request, user)
  },
})
