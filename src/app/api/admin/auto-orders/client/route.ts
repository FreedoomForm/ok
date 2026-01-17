import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'

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
      createdAt: {
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
async function createAutoOrdersForClient(client: any, startDate: Date, endDate: Date, adminId: string): Promise<any[]> {
  const createdOrders: any[] = []
  const currentDate = new Date(startDate)

  // Get the next order number
  const lastOrder = await db.order.findFirst({
    orderBy: {
      orderNumber: 'desc'
    }
  })

  let nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

  while (currentDate <= endDate) {
    const dayOfWeek = getDayOfWeek(currentDate)

    // Check if client should receive order on this day
    if (client.deliveryDays[dayOfWeek] && !(await orderExistsForDate(client.id, currentDate))) {
      try {
        const newOrder = await db.order.create({
          data: {
            orderNumber: nextOrderNumber++,
            customerId: client.id,
            adminId: adminId,
            deliveryAddress: client.address,
            deliveryTime: generateDeliveryTime(),
            quantity: 1,
            calories: client.calories,
            specialFeatures: client.preferences,
            paymentStatus: PaymentStatus.UNPAID,
            paymentMethod: PaymentMethod.CASH,
            orderStatus: OrderStatus.PENDING,
            isPrepaid: false,
            createdAt: new Date(currentDate)
          },
          include: {
            customer: true
          }
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
    let deliveryDays = {}
    try {
      if (client.deliveryDays) {
        deliveryDays = JSON.parse(client.deliveryDays)
      }
    } catch (e) {
      console.error('Error parsing client delivery days:', e)
    }

    // Calculate date range (next 30 days from today)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    console.log(`Creating auto orders for client ${client.name} from ${startDate.toDateString()} to ${endDate.toDateString()}`)

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

    console.log(`Created ${createdOrders.length} auto orders for client: ${client.name}`)

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
    const clientStats: any[] = []

    for (const client of clients) {
      if (client.autoOrdersEnabled) {
        let deliveryDays = {}
        try {
          if (client.deliveryDays) {
            deliveryDays = JSON.parse(client.deliveryDays)
          }
        } catch (e) {
          console.error('Error parsing client delivery days:', e)
        }

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