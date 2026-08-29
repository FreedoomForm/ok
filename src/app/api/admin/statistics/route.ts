import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { buildDeliveryStatistics, buildOrderStatistics, filterEffectiveOrderRows, resolveStatisticsRange } from '@/lib/admin/statistics'
import { getDisabledResourceDates } from '@/lib/resource-availability'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' }, { status: 403 }
      )
    }

    // Build where clause for filtering
    const whereClause: Prisma.OrderWhereInput = {}

    if (user.role !== 'SUPER_ADMIN') {
      const groupAdminIds = await getGroupAdminIds(user)
      if (groupAdminIds) {
        whereClause.adminId = { in: groupAdminIds }
      } else {
        whereClause.adminId = user.id
      }
    }

    const range = resolveStatisticsRange({
      date: request.nextUrl.searchParams.get('date'),
      from: request.nextUrl.searchParams.get('from'),
      to: request.nextUrl.searchParams.get('to'),
    })
    if (range === 'invalid') {
      return NextResponse.json({ error: 'Некорректный диапазон дат' }, { status: 400 })
    }

    if (range.kind === 'range') {
      const candidateOrders = await db.order.findMany({
        where: { ...whereClause, deliveryDate: { gte: range.start, lte: range.end } },
        select: { id: true, customerId: true, deliveryDate: true },
      })
      const disabledDates = await getDisabledResourceDates('CLIENT', [...new Set(candidateOrders.map((order) => order.customerId))], range.start, range.end)
      const effectiveOrders = filterEffectiveOrderRows(candidateOrders, disabledDates)
      whereClause.id = { in: effectiveOrders.map((order) => order.id) }
    }

    const [statusCounts, prepaidCounts, paymentMethodCounts, calorieCounts, quantityCounts, specialPreferenceCustomers, deliveryOrders] = await Promise.all([
      db.order.groupBy({ where: whereClause, by: ['orderStatus'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['isPrepaid'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['paymentMethod'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['calories'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['quantity'], _count: { _all: true } }),
      db.order.count({ where: { ...whereClause, specialFeatures: { notIn: ['', '{}'] } } }),
      db.order.findMany({
        where: whereClause,
        select: { customerId: true }
      })
    ])

    const deliveryCustomerIds = [...new Set(deliveryOrders.map((order) => order.customerId))]
    const deliveryCustomers = deliveryCustomerIds.length === 0
      ? []
      : await db.customer.findMany({
        where: { id: { in: deliveryCustomerIds } },
        select: { id: true, deliveryDays: true },
      })
    const deliveryDaysByCustomerId = new Map(deliveryCustomers.map((customer) => [customer.id, customer.deliveryDays]))
    const delivery = buildDeliveryStatistics(deliveryOrders.map((order) => ({ customer: { deliveryDays: deliveryDaysByCustomerId.get(order.customerId) ?? null } })))

    const stats = buildOrderStatistics({
      statusCounts: statusCounts.map((row) => ({ value: row.orderStatus, count: row._count._all })),
      prepaidCounts: prepaidCounts.map((row) => ({ value: row.isPrepaid, count: row._count._all })),
      paymentMethodCounts: paymentMethodCounts.map((row) => ({ value: row.paymentMethod, count: row._count._all })),
      calorieCounts: calorieCounts.map((row) => ({ value: row.calories, count: row._count._all })),
      quantityCounts: quantityCounts.map((row) => ({ value: row.quantity, count: row._count._all })),
      specialPreferenceCustomers,
      delivery,
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
      },
      { status: 500 }
    )
  }
}
