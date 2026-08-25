import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { safeJsonParse } from '@/lib/safe-json'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'
import { allocateOrderNumber } from '@/lib/orders/number'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import type {
  AutoOrderClientRecord,
  CreatedAutoOrderRecord,
} from '@/lib/admin/auto-orders'

type AutoOrderClientStatus = {
  clientId: string
  clientName: string
  autoOrdersEnabled: boolean
  isActive: boolean
  upcomingOrders: number
  nextDeliveryDate: string | null
  deliveryDays: Record<string, boolean>
}

// Function to get day of week in Russian
function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

function startOfDay(date: Date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value }
function endOfDay(date: Date) { const value = new Date(date); value.setHours(23, 59, 59, 999); return value }

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
async function createAutoOrdersForClient(
  client: AutoOrderClientRecord,
  startDate: Date,
  endDate: Date,
  adminId: string,
  disabledDates: ReadonlySet<string> = new Set(),
): Promise<CreatedAutoOrderRecord[]> {
  const createdOrders: CreatedAutoOrderRecord[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayOfWeek = getDayOfWeek(currentDate)

    const dateKey = toAvailabilityDateKey(currentDate)
    // Disabled client days have zero effective order impact and never create an order.
    if (client.deliveryDays[dayOfWeek] && !disabledDates.has(dateKey) && !(await orderExistsForDate(client.id, currentDate))) {
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
                customer: true,
                admin: true
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

function forecastDates(
  deliveryDays: Record<string, boolean>,
  startDate: Date,
      endDate: Date,
  existingDates: Set<string>,
  disabledDates: ReadonlySet<string> = new Set(),
): string[] {
  const dates: string[] = []
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateKey = toAvailabilityDateKey(currentDate)
    if (deliveryDays[getDayOfWeek(currentDate)] && !disabledDates.has(dateKey) && !existingDates.has(dateKey)) dates.push(dateKey)
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return dates
}

// Function to check and extend orders for next month
async function extendOrdersForNextMonth(adminId: string, groupAdminIds: string[] | null) {
  const today = new Date()
  const nextMonthStart = new Date(today)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)
  nextMonthStart.setDate(1)

  const nextMonthEnd = new Date(nextMonthStart)
  nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1)
  nextMonthEnd.setDate(0) // Last day of next month

  // Get only active, non-deleted clients with auto orders enabled in scope.
  const customers = await db.customer.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      autoOrdersEnabled: true,
      ...(groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      deliveryDays: true,
      autoOrdersEnabled: true,
      calories: true,
      preferences: true,
    },
  })

  const activeClients: AutoOrderClientRecord[] = []

  for (const customer of customers) {
    if (customer.autoOrdersEnabled) {
      const deliveryDays = safeJsonParse<Record<string, boolean>>(customer.deliveryDays, {})

      activeClients.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        deliveryDays: deliveryDays,
        calories: customer.calories,
        preferences: customer.preferences
      })
    }
  }

  const disabledDatesByClient = await getDisabledResourceDates(
    'CLIENT',
    activeClients.map((client) => client.id),
    startOfDay(nextMonthStart),
    endOfDay(nextMonthEnd),
  )
  const totalCreatedOrders: CreatedAutoOrderRecord[] = []

  // Create orders for each client
  for (const client of activeClients) {
    const createdOrders = await createAutoOrdersForClient(
      client,
      nextMonthStart,
      nextMonthEnd,
      adminId,
      disabledDatesByClient.get(client.id) ?? new Set(),
    )

    if (createdOrders.length > 0) {
      totalCreatedOrders.push(...createdOrders)
    }
  }

  return {
    period: {
      start: nextMonthStart.toISOString().split('T')[0],
      end: nextMonthEnd.toISOString().split('T')[0]
    },
    totalClients: activeClients.length,
    totalOrdersCreated: totalCreatedOrders.length,
    orders: totalCreatedOrders
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    // Check for cron token or admin request
    const cronToken = request.headers.get('X-Cron-Token')
    const isCronRequest = cronToken === process.env.CRON_SECRET_TOKEN

    let adminId = ''
    let groupAdminIds: string[] | null = null

    if (!isCronRequest) {
      if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
      }
      adminId = user.id
      groupAdminIds = user.role === 'MIDDLE_ADMIN' ? await getGroupAdminIds(user) : null
    } else {
      // For cron request, use a system admin or super admin
      const superAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })
      if (superAdmin) {
        adminId = superAdmin.id
      } else {
        // Fallback or error if no super admin
        return NextResponse.json({ error: 'System configuration error: No SUPER_ADMIN found' }, { status: 500 })
      }
    }

    // Extend orders for next month
    const result = await extendOrdersForNextMonth(adminId, groupAdminIds)

    return NextResponse.json({
      message: `Автоматически расширены заказы на следующий месяц`,
      ...result,
      isCronRequest
    })

  } catch (error) {
    console.error('Error extending auto orders:', error)
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

    // Get current auto orders status without creating orders.
    const today = new Date()
    const thirtyDaysLater = new Date(today)
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    const groupAdminIds = await getGroupAdminIds(user)
    const customers = await db.customer.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        autoOrdersEnabled: true,
        createdBy: { in: groupAdminIds },
      },
      select: { id: true, name: true, phone: true, isActive: true, deliveryDays: true },
    })
    const existingOrders = customers.length === 0
      ? []
      : await db.order.findMany({
          where: {
            customerId: { in: customers.map((customer) => customer.id) },
            deliveryDate: { gte: startOfDay(today), lte: endOfDay(thirtyDaysLater) },
          },
          select: { customerId: true, deliveryDate: true },
        })
    const existingDatesByCustomer = new Map<string, Set<string>>()
    for (const order of existingOrders) {
      if (!order.deliveryDate) continue
      const dates = existingDatesByCustomer.get(order.customerId) ?? new Set<string>()
      dates.add(toAvailabilityDateKey(order.deliveryDate))
      existingDatesByCustomer.set(order.customerId, dates)
    }
    const disabledDatesByClient = await getDisabledResourceDates(
      'CLIENT',
      customers.map((customer) => customer.id),
      startOfDay(today),
      endOfDay(thirtyDaysLater),
    )
    const clientStatuses: AutoOrderClientStatus[] = customers.map((customer) => {
      const deliveryDays = safeJsonParse<Record<string, boolean>>(customer.deliveryDays, {})
      const dates = forecastDates(
        deliveryDays,
        today,
        thirtyDaysLater,
        existingDatesByCustomer.get(customer.id) ?? new Set(),
        disabledDatesByClient.get(customer.id) ?? new Set(),
      )
      return {
        clientId: customer.id,
        clientName: customer.name,
        autoOrdersEnabled: true,
        isActive: customer.isActive,
        upcomingOrders: dates.length,
        nextDeliveryDate: dates[0] ?? null,
        deliveryDays,
      }
    })

    return NextResponse.json({
      status: 'active',
      totalActiveClients: clientStatuses.length,
      clients: clientStatuses,
      summary: {
        totalUpcomingOrders: clientStatuses.reduce((sum, client) => sum + client.upcomingOrders, 0)
      }
    })

  } catch (error) {
    console.error('Error getting auto orders status:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
