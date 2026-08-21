import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { safeJsonParse } from '@/lib/safe-json'
import { buildOrderStatistics } from '@/lib/admin/statistics'

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

    const [statusCounts, prepaidCounts, paymentMethodCounts, calorieCounts, quantityCounts, specialPreferenceCustomers, deliveryOrders] = await Promise.all([
      db.order.groupBy({ where: whereClause, by: ['orderStatus'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['isPrepaid'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['paymentMethod'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['calories'], _count: { _all: true } }),
      db.order.groupBy({ where: whereClause, by: ['quantity'], _count: { _all: true } }),
      db.order.count({ where: { ...whereClause, specialFeatures: { notIn: ['', '{}'] } } }),
      db.order.findMany({
        where: whereClause,
        select: { customer: { select: { deliveryDays: true } } }
      })
    ])

    const isDailyCustomer = (deliveryDays: string | null): boolean => {
      if (!deliveryDays) return false
      const days = safeJsonParse<Record<string, boolean>>(deliveryDays, {})
      return !!(days.monday && days.tuesday && days.wednesday && days.thursday && days.friday && days.saturday && days.sunday)
    }

    const delivery = deliveryOrders.reduce((counts, order) => {
      const deliveryDays = order.customer?.deliveryDays ?? null
      if (isDailyCustomer(deliveryDays)) {
        counts.dailyCustomers += 1
        return counts
      }
      const days = safeJsonParse<Record<string, boolean>>(deliveryDays, {})
      const selectedDays = Object.values(days).filter(Boolean).length
      if (selectedDays >= 3 && selectedDays <= 4) counts.evenDayCustomers += 1
      return counts
    }, { dailyCustomers: 0, evenDayCustomers: 0, oddDayCustomers: 0 })

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
