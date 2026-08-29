import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { resolveEffectiveCourierId, type CustomerScopedAssignment } from '@/lib/couriers/effective-assignment'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    let dateFilter: Prisma.OrderWhereInput = {}
    if (dateParam) {
      const date = new Date(dateParam)
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)

      dateFilter = {
        deliveryDate: {
          gte: start,
          lte: end,
        },
      }
    } else if (fromParam || toParam) {
      const deliveryDate: Prisma.DateTimeFilter = {}

      if (fromParam) {
        const from = new Date(fromParam)
        if (!Number.isNaN(from.getTime())) {
          const start = new Date(from)
          start.setHours(0, 0, 0, 0)
          deliveryDate.gte = start
        }
      }

      if (toParam) {
        const to = new Date(toParam)
        if (!Number.isNaN(to.getTime())) {
          const end = new Date(to)
          end.setHours(23, 59, 59, 999)
          deliveryDate.lte = end
        }
      }

      if (Object.keys(deliveryDate).length > 0) {
        dateFilter = { deliveryDate }
      }
    }

    let orders = await db.order.findMany({
      where: {
        courierId: user.id,
        deletedAt: null,
        orderStatus: { not: OrderStatus.PAUSED },
        customer: {
          isActive: true,
          autoOrdersEnabled: true,
        },
        ...dateFilter,
      },
      orderBy: {
        deliveryTime: 'asc',
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    })

    // §6: orders whose covering contract period assigns this courier are part of
    // the effective assignment even when their stored default courier differs.
    // The lookup window comes from the explicit from/to params (the courier
    // portal always sends them) and falls back to the dated own orders, then to
    // the current day.
    const parseWindowDate = (value: string | null) => {
      if (!value) return null
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    const ownDated = orders.filter((order) => order.deliveryDate instanceof Date)
    const ownDates = ownDated.map((order) => order.deliveryDate?.getTime() ?? 0)
    const today = new Date()
    const windowStart = parseWindowDate(fromParam) ?? (ownDates.length > 0 ? new Date(Math.min(...ownDates)) : today)
    const windowEnd = parseWindowDate(toParam) ?? (ownDates.length > 0 ? new Date(Math.max(...ownDates)) : today)
    windowStart.setHours(0, 0, 0, 0)
    windowEnd.setHours(23, 59, 59, 999)
    const assignedPeriods = await db.contractPeriod.findMany({
      where: {
        courierId: user.id,
        status: 'ENABLED',
        contract: { status: 'ENABLED' },
        startDate: { lte: windowEnd },
        endDate: { gte: windowStart },
      },
      select: { contract: { select: { customerId: true } } },
    })
    const assignedCustomerIds = [...new Set(assignedPeriods.map((period) => period.contract.customerId))]
    if (assignedCustomerIds.length > 0) {
      const extraOrders = await db.order.findMany({
        where: {
          customerId: { in: assignedCustomerIds },
          deletedAt: null,
          orderStatus: { not: OrderStatus.PAUSED },
          customer: { isActive: true, autoOrdersEnabled: true },
          id: { notIn: orders.map((order) => order.id) },
          ...dateFilter,
        },
        orderBy: { deliveryTime: 'asc' },
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      })
      orders = [...orders, ...extraOrders]
    }

    const datedOrders = orders.filter((order) => order.deliveryDate instanceof Date)
    let visibleOrders = orders
    if (datedOrders.length > 0) {
      const clientIds = [...new Set(datedOrders.map((order) => order.customerId))]
      const dates = datedOrders.map((order) => order.deliveryDate?.getTime() ?? 0)
      const rangeStart = new Date(Math.min(...dates))
      const rangeEnd = new Date(Math.max(...dates))
      const [clientDisabledDates, courierDisabledDates, periodRows] = await Promise.all([
        getDisabledResourceDates('CLIENT', clientIds, rangeStart, rangeEnd),
        getDisabledResourceDates('COURIER', [user.id], rangeStart, rangeEnd),
        clientIds.length > 0 ? db.contractPeriod.findMany({
          where: {
            status: 'ENABLED',
            contract: { customerId: { in: clientIds }, status: 'ENABLED' },
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
          },
          select: { courierId: true, startDate: true, endDate: true, enabledWeekdays: true, status: true, contract: { select: { customerId: true } } },
        }) : Promise.resolve([] as Array<{ courierId: string | null; startDate: Date; endDate: Date; enabledWeekdays: unknown; status: string; contract: { customerId: string } }>),
      ])
      const assignments: CustomerScopedAssignment[] = periodRows.map((row) => ({
        contractCustomerId: row.contract.customerId,
        courierId: row.courierId,
        startDate: row.startDate,
        endDate: row.endDate,
        enabledWeekdays: Array.isArray(row.enabledWeekdays) ? (row.enabledWeekdays as string[]) : [],
        status: row.status,
      }))
      const courierDisabled = courierDisabledDates.get(user.id)
      visibleOrders = orders.filter((order) => {
        if (!order.deliveryDate) return true
        const dateKey = toAvailabilityDateKey(order.deliveryDate)
        if (clientDisabledDates.get(order.customerId)?.has(dateKey)) return false
        if (courierDisabled?.has(dateKey)) return false
        // §6: the list is built from the effective contract-period assignment,
        // not from the stored default super-admin fallback courier.
        return resolveEffectiveCourierId(order, assignments) === user.id
      })
    }

    return NextResponse.json(visibleOrders)
  } catch (error) {
    console.error('Error fetching courier orders:', error)
    return NextResponse.json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
    }, { status: 500 })
  }
}

