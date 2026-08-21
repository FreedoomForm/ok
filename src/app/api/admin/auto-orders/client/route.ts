import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { safeJsonParse } from '@/lib/safe-json'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'
import { allocateOrderNumber } from '@/lib/orders/number'
import type {
  AutoOrderClientRecord,
  CreatedAutoOrderRecord,
} from '@/lib/admin/auto-orders'

// Function to get day of week in Russian
function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

// Function to check if order already exists for specific date
async function orderExistsForDate(clientId: string, targetDate: Date): Promise<boolean> {
  const compareDate = new Date(targetDate)
  compareDate.setHours(0, 0, 0, 0)

  const nextDay = new Date(compareDate)
  nextDay.setDate(nextDay.getDate() + 1)

  const existingOrder = await db.order.findFirst({
    where: {
      customerId: clientId,
      deliveryDate: {
        gte: compareDate,
        lt: nextDay
      }
    }
  })

  return !!existingOrder
}

// Function to generate default delivery time based on client preferences
function generateDeliveryTime(): string {
  const now = new Date()
  const deliveryHour = 11 + Math.floor(Math.random() * 3) // 11:00 - 14:00
  const deliveryMinute = Math.floor(Math.random() * 60)

  now.setHours(deliveryHour, deliveryMinute, 0, 0)
  return now.toTimeString().slice(0, 5)
}

// Function to create auto orders for a client for specified date range
async function createAutoOrdersForClient(client: AutoOrderClientRecord, startDate: Date, endDate: Date, adminId: string): Promise<CreatedAutoOrderRecord[]> {
  const createdOrders: CreatedAutoOrderRecord[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayOfWeek = getDayOfWeek(currentDate)

    // Check if client should receive order on this day
    if (client.deliveryDays[dayOfWeek] && !(await orderExistsForDate(client.id, currentDate))) {
      try {
        const newOrder = await db.$transaction(async (tx) => {
            const orderNumber = await allocateOrderNumber(tx)
            return tx.order.create({
              data: {
                orderNumber,
                customerId: client.id,
                adminId: adminId,
                deliveryAddress: client.address,
                latitude: client.latitude ?? null,
                longitude: client.longitude ?? null,
                deliveryDate: new Date(currentDate),
                deliveryTime: generateDeliveryTime(),
                quantity: 1,
                calories: client.calories,
                specialFeatures: client.preferences,
                paymentStatus: PaymentStatus.UNPAID,
                paymentMethod: PaymentMethod.CASH,
                orderStatus: OrderStatus.NEW,
                isPrepaid: false,
              },
              include: {
                customer: true
              }
            })
          })

        createdOrders.push({
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          customer: {
            id: newOrder.customer.id,
            name: newOrder.customer.name,
            phone: newOrder.customer.phone
          },
          customerName: newOrder.customer.name,
          customerPhone: newOrder.customer.phone,
          deliveryAddress: newOrder.deliveryAddress,
          deliveryTime: newOrder.deliveryTime,
          deliveryDate: currentDate.toISOString().split('T')[0],
          quantity: newOrder.quantity,
          calories: newOrder.calories,
          specialFeatures: newOrder.specialFeatures,
          paymentStatus: newOrder.paymentStatus,
          paymentMethod: newOrder.paymentMethod,
          isPrepaid: newOrder.isPrepaid,
          orderStatus: newOrder.orderStatus,
          isAutoOrder: true,
          createdAt: newOrder.createdAt
        })
      } catch (error) {
        console.error(`Error creating order for ${client.name} on ${currentDate.toDateString()}:`, error)
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return createdOrders
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, daysAhead = 30 } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Требуется ID клиента' }, { status: 400 })
    }

    // Find the client
    const client = await db.customer.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    if (!client.autoOrdersEnabled) {
      return NextResponse.json({ error: 'Автоматические заказы отключены для этого клиента' }, { status: 400 })
    }

    // Parse delivery days
    const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, {})

    // Calculate date range (next 30 days from today)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    // Create orders for the client
    const createdOrders = await createAutoOrdersForClient(
      {
        ...client,
        deliveryDays: deliveryDays,
      },
      startDate,
      endDate,
      user.id
    )


    return NextResponse.json({
      message: `Автоматически создано ${createdOrders.length} заказов для клиента ${client.name}`,
      clientId: client.id,
      clientName: client.name,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      createdOrders: createdOrders.length,
      orders: createdOrders
    })

  } catch (error) {
    console.error('Error creating auto orders for client:', error)
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

    // Get all clients
    const clients = await db.customer.findMany({
      include: {
        orders: {
          where: {
            createdAt: {
              gte: new Date()
            }
          }
        }
      }
    })

    // Get statistics for each client with auto orders enabled
    const clientStats: Array<{
      clientId: string
      clientName: string
      clientPhone: string
      deliveryDays: Record<string, boolean>
      estimatedOrders: number
      nextDeliveryDate: string | null
    }> = []

    for (const client of clients) {
      if (client.autoOrdersEnabled) {
        const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, {})

        const today = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        const clientOrders = await createAutoOrdersForClient(
          {
            ...client,
            deliveryDays: deliveryDays,
          },
          today,
          endDate,
          user.id
        )

        clientStats.push({
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          deliveryDays: deliveryDays,
          estimatedOrders: clientOrders.length,
          nextDeliveryDate: clientOrders.length > 0 ? clientOrders[0].deliveryDate : null
        })
      }
    }

    return NextResponse.json({
      totalClients: clientStats.length,
      clients: clientStats,
      summary: {
        totalEstimatedOrders: clientStats.reduce((sum, client) => sum + client.estimatedOrders, 0)
      }
    })

  } catch (error) {
    console.error('Error getting auto orders forecast:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
