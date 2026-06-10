import { createApiRoute } from '@/modules/shared/http'
import { db } from '@/lib/db'
import { safeJsonParse } from '@/lib/safe-json'
import { PaymentStatus, PaymentMethod, OrderStatus, Prisma } from '@prisma/client'

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

async function orderExistsForDate(clientId: string, targetDate: Date): Promise<boolean> {
  const compareDate = new Date(targetDate); compareDate.setHours(0, 0, 0, 0)
  const nextDay = new Date(compareDate); nextDay.setDate(nextDay.getDate() + 1)
  const existing = await db.order.findFirst({ where: { customerId: clientId, deliveryDate: { gte: compareDate, lt: nextDay } } })
  return !!existing
}

function generateDeliveryTime(): string {
  const now = new Date()
  const deliveryHour = 11 + Math.floor(Math.random() * 3)
  const deliveryMinute = Math.floor(Math.random() * 60)
  now.setHours(deliveryHour, deliveryMinute, 0, 0)
  return now.toTimeString().slice(0, 5)
}

async function getNextOrderNumber(): Promise<number> {
  const lastOrder = await db.order.findFirst({ orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } })
  return lastOrder ? lastOrder.orderNumber + 1 : 1
}

async function createAutoOrdersForClient(client: Record<string, unknown>, startDate: Date, endDate: Date, adminId: string): Promise<unknown[]> {
  const createdOrders: unknown[] = []
  const currentDate = new Date(startDate)
  let nextOrderNumber = await getNextOrderNumber()

  while (currentDate <= endDate) {
    const dayOfWeek = getDayOfWeek(currentDate)
    const deliveryDays = (client.deliveryDays ?? {}) as Record<string, boolean>

    if (deliveryDays[dayOfWeek] && !(await orderExistsForDate(client.id as string, currentDate))) {
      try {
        let newOrder: Record<string, unknown> | null = null
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            newOrder = await db.order.create({
              data: {
                orderNumber: nextOrderNumber,
                customerId: client.id as string,
                adminId,
                deliveryAddress: client.address as string,
                latitude: (client.latitude as number) ?? null,
                longitude: (client.longitude as number) ?? null,
                deliveryDate: new Date(currentDate),
                deliveryTime: generateDeliveryTime(),
                quantity: 1,
                calories: client.calories as number,
                specialFeatures: client.preferences as string,
                paymentStatus: PaymentStatus.UNPAID,
                paymentMethod: PaymentMethod.CASH,
                orderStatus: OrderStatus.NEW,
                isPrepaid: false,
              },
              include: { customer: true, admin: true },
            }) as unknown as Record<string, unknown>
            nextOrderNumber += 1
            break
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              nextOrderNumber = await getNextOrderNumber(); continue
            }
            throw error
          }
        }
        if (!newOrder) continue
        createdOrders.push({
          id: newOrder.id,
          customerName: (newOrder.customer as Record<string, unknown>)?.name,
          deliveryAddress: newOrder.deliveryAddress,
          deliveryDate: currentDate.toISOString().split('T')[0],
          isAutoOrder: true,
        })
      } catch (error) {
        console.error(`Error creating order for ${String(client.name)} on ${currentDate.toDateString()}:`, error)
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return createdOrders
}

async function extendOrdersForNextMonth(adminId: string) {
  const today = new Date()
  const nextMonthStart = new Date(today); nextMonthStart.setMonth(nextMonthStart.getMonth() + 1); nextMonthStart.setDate(1)
  const nextMonthEnd = new Date(nextMonthStart); nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1); nextMonthEnd.setDate(0)

  const customers = await db.customer.findMany()
  const activeClients: Record<string, unknown>[] = []

  for (const customer of customers) {
    if (customer.autoOrdersEnabled) {
      const deliveryDays = safeJsonParse<Record<string, boolean>>(customer.deliveryDays, {})
      activeClients.push({
        id: customer.id, name: customer.name, phone: customer.phone, address: customer.address,
        deliveryDays, calories: customer.calories, preferences: customer.preferences,
      })
    }
  }

  const totalCreatedOrders: unknown[] = []
  for (const client of activeClients) {
    const createdOrders = await createAutoOrdersForClient(client, nextMonthStart, nextMonthEnd, adminId)
    if (createdOrders.length > 0) totalCreatedOrders.push(...createdOrders)
  }

  return {
    period: { start: nextMonthStart.toISOString().split('T')[0], end: nextMonthEnd.toISOString().split('T')[0] },
    totalClients: activeClients.length,
    totalOrdersCreated: totalCreatedOrders.length,
  }
}

export const POST = createApiRoute<{
  message: string; totalOrdersCreated: number; isCronRequest: boolean; period?: { start: string; end: string }; totalClients?: number
}>({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request }) => {
    const cronToken = request.headers.get('X-Cron-Token')
    const isCronRequest = cronToken === process.env.CRON_SECRET_TOKEN

    let adminId = ''
    if (!isCronRequest) {
      adminId = user.id
    } else {
      const superAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })
      if (superAdmin) adminId = superAdmin.id
      else return { data: { message: 'No SUPER_ADMIN found', totalOrdersCreated: 0, isCronRequest: Boolean(isCronRequest) } }
    }

    const result = await extendOrdersForNextMonth(adminId)
    return { data: { message: 'Auto-orders extended for next month', ...result, isCronRequest: Boolean(isCronRequest) } }
  },
})

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user }) => {
    const today = new Date()
    const thirtyDaysLater = new Date(today); thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    const customers = await db.customer.findMany()
    const clientStatuses: unknown[] = []

    for (const customer of customers) {
      if (customer.autoOrdersEnabled) {
        const deliveryDays = safeJsonParse<Record<string, boolean>>(customer.deliveryDays, {})
        const clientOrders = await createAutoOrdersForClient(
          { ...customer, deliveryDays, calories: customer.calories, preferences: customer.preferences },
          today, thirtyDaysLater, user.id,
        )
        clientStatuses.push({
          clientId: customer.id, clientName: customer.name, autoOrdersEnabled: customer.autoOrdersEnabled,
          upcomingOrders: clientOrders.length, nextDeliveryDate: clientOrders.length > 0 ? (clientOrders[0] as Record<string, unknown>)?.deliveryDate : null,
          deliveryDays,
        })
      }
    }

    return {
      data: {
        status: 'active',
        totalActiveClients: clientStatuses.length,
        clients: clientStatuses,
        summary: { totalUpcomingOrders: (clientStatuses as Record<string, unknown>[]).reduce((sum, client) => sum + ((client.upcomingOrders as number) || 0), 0) },
      },
    }
  },
})
