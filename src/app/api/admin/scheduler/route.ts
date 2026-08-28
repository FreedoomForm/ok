import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'
import { allocateOrderNumber } from '@/lib/orders/number'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { buildSchedulerCustomerWhere, buildSchedulerOrderWhere } from '@/lib/admin/scheduler'
import { parseBoundedPagination } from '@/lib/pagination'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { isAutoOrderEligibleOn } from '@/lib/scheduling/auto-order-eligibility'

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

function generateDeliveryTime(): string {
  const hour = 11 + Math.floor(Math.random() * 3) // 11:00 - 14:00
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30) // Generate for next 30 days

    const groupAdminIds = await getGroupAdminIds(user)

    // Get active customers with auto-orders enabled within the caller's admin scope.
    const customers = await db.customer.findMany(({
      where: {
        ...buildSchedulerCustomerWhere(groupAdminIds),
        isActive: true,
        autoOrdersEnabled: true
      },
      select: {
        id: true,
        address: true,
        latitude: true,
        longitude: true,
        preferences: true,
        createdBy: true,
        deliveryDays: true,
        calories: true,
        defaultCourierId: true,
        autoOrdersEnabled: true,
        orderPattern: true,
        contracts: {
          where: { status: { not: 'DELETED' } },
          select: {
            status: true,
            periods: {
              where: { status: { not: 'DELETED' } },
              select: { status: true, startDate: true, endDate: true, enabledWeekdays: true, disabledDates: true },
            },
          },
        },
      }
    }))

    const disabledCustomerDates = await getDisabledResourceDates('CLIENT', customers.map((client) => client.id), today, endDate)
    let totalOrdersCreated = 0

    for (const client of customers) {
      // Parse delivery days from database
      const defaultDeliveryDays = {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      }
      const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, defaultDeliveryDays)

      // Get calories from database
      const calories = client.calories || 2000
      const disabledDates = disabledCustomerDates.get(client.id)
      const contracts = client.contracts.map((contract) => ({
        status: contract.status as 'ENABLED' | 'DISABLED' | 'DELETED',
        periods: contract.periods.map((period) => ({
          status: period.status as 'ENABLED' | 'DISABLED' | 'DELETED',
          startDate: period.startDate.toISOString().slice(0, 10),
          endDate: period.endDate.toISOString().slice(0, 10),
          enabledWeekdays: Array.isArray(period.enabledWeekdays)
            ? period.enabledWeekdays.filter((value): value is string => typeof value === 'string')
            : [],
          disabledDates: Array.isArray(period.disabledDates)
            ? period.disabledDates.filter((value): value is string => typeof value === 'string')
            : [],
        })),
      }))

      // Iterate through each day in the next 30 days
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const deliveryDate = new Date(d)
        const deliveryDateKey = deliveryDate.toISOString().slice(0, 10)

        if (!isAutoOrderEligibleOn({
          autoOrdersEnabled: client.autoOrdersEnabled,
          orderPattern: client.orderPattern,
          deliveryDays,
          disabledDates: disabledDates ? [...disabledDates] : [],
          contracts,
        }, deliveryDateKey)) {
          continue
        }

        // Check if order already exists for this client and date
        const existingOrder = await db.order.findFirst({
          where: {
            customerId: client.id,
            deliveryDate: {
              gte: new Date(deliveryDate.setHours(0, 0, 0, 0)),
              lt: new Date(deliveryDate.setHours(23, 59, 59, 999))
            }
          }
        })

        if (!existingOrder) {
          // Create order
          // Use client's creator if available, otherwise use current user
          const adminId = client.createdBy || user.id

          await db.$transaction(async (tx) => {
            const orderNumber = await allocateOrderNumber(tx)
            await tx.order.create({
            data: {
              orderNumber,
              customerId: client.id,
              adminId: adminId,
              deliveryAddress: client.address,
              latitude: client.latitude ?? null,
              longitude: client.longitude ?? null,
              deliveryDate: new Date(d),
              deliveryTime: generateDeliveryTime(),
              quantity: 1,
              calories: calories,
              specialFeatures: client.preferences,
              paymentStatus: PaymentStatus.UNPAID,
              paymentMethod: PaymentMethod.CASH,
              isPrepaid: false,
              orderStatus: OrderStatus.NEW,
              fromAutoOrder: true,
              courierId: client.defaultCourierId || null
            }
            })
          })
          totalOrdersCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Планировщик завершен. Создано ${totalOrdersCreated} заказов.`,
      ordersCreated: totalOrdersCreated,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error running scheduler:', error)
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

    const groupAdminIds = await getGroupAdminIds(user)
    const customerWhere = buildSchedulerCustomerWhere(groupAdminIds)
    const now = new Date()
    const orderWhere = buildSchedulerOrderWhere(groupAdminIds, now)
    const pagination = parseBoundedPagination(
      new URL(request.url).searchParams.get('limit'),
      new URL(request.url).searchParams.get('offset'),
    )
    const customerSelect = {
      id: true,
      name: true,
      isActive: true,
      autoOrdersEnabled: true,
      calories: true,
      createdAt: true,
    } as const
    const customersPromise = pagination
      ? db.customer.findMany({
          where: customerWhere,
          orderBy: { createdAt: 'desc' },
          select: customerSelect,
          skip: pagination.offset,
          take: pagination.limit,
        })
      : db.customer.findMany({
          where: customerWhere,
          orderBy: { createdAt: 'desc' },
          select: customerSelect,
        })

    const [totalClients, activeClients, totalOrders, autoOrders, customers] = await Promise.all([
      db.customer.count({ where: customerWhere }),
      db.customer.count({ where: { ...customerWhere, isActive: true, autoOrdersEnabled: true } }),
      db.order.count({ where: orderWhere }),
      db.order.count({ where: { ...orderWhere, fromAutoOrder: true } }),
      customersPromise,
    ])

    return NextResponse.json({
      status: 'Планировщик активен (Database)',
      timestamp: new Date().toISOString(),
      stats: {
        totalClients,
        activeClients,
        totalOrders,
        autoOrders,
        manualOrders: totalOrders - autoOrders
      },
      clients: customers.map(client => ({
        id: client.id,
        name: client.name,
        isActive: client.isActive,
        autoOrdersEnabled: client.autoOrdersEnabled,
        calories: client.calories,
        createdAt: client.createdAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
