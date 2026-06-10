import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { safeJsonParse } from '@/modules/shared/validation/safe-json'
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
              include: { customer: true },
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

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request }) => {
    const body = await request.json()
    const { clientId, daysAhead = 30 } = body

    if (!clientId) {
      throw new BadRequestError('Client ID is required')
    }

    const client = await db.customer.findUnique({ where: { id: clientId } })
    if (!client) {
      throw new NotFoundError('Customer', clientId)
    }
    if (!client.autoOrdersEnabled) {
      throw new BadRequestError('Auto-orders are disabled for this client')
    }

    const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, {})
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + (daysAhead as number))

    const createdOrders = await createAutoOrdersForClient(
      { ...client, deliveryDays },
      startDate, endDate, user.id,
    )

    return {
      data: {
        message: `Automatically created ${createdOrders.length} orders for client ${client.name}`,
        clientId: client.id,
        clientName: client.name,
        dateRange: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
        createdOrders: createdOrders.length,
        orders: createdOrders,
      },
    }
  },
})

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user }) => {
    const clients = await db.customer.findMany({
      include: { orders: { where: { createdAt: { gte: new Date() } } } },
    })
    const clientStats: unknown[] = []

    for (const client of clients) {
      if (client.autoOrdersEnabled) {
        const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, {})
        const today = new Date()
        const endDate = new Date(); endDate.setDate(endDate.getDate() + 30)

        const clientOrders = await createAutoOrdersForClient(
          { ...client, deliveryDays },
          today, endDate, user.id,
        )

        clientStats.push({
          clientId: client.id, clientName: client.name, clientPhone: client.phone,
          deliveryDays, estimatedOrders: clientOrders.length,
          nextDeliveryDate: clientOrders.length > 0 ? (clientOrders[0] as Record<string, unknown>)?.deliveryDate : null,
        })
      }
    }

    return {
      data: {
        totalClients: clientStats.length,
        clients: clientStats,
        summary: { totalEstimatedOrders: (clientStats as Record<string, unknown>[]).reduce((sum, client) => sum + ((client.estimatedOrders as number) || 0), 0) },
      },
    }
  },
})
