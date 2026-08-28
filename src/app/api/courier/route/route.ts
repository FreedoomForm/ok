import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { isValidResourceDate } from '@/lib/admin/resource-details'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const selectedDateISO = new URL(request.url).searchParams.get('date')
    if (selectedDateISO && !isValidResourceDate(selectedDateISO)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    const today = selectedDateISO ? new Date(`${selectedDateISO}T00:00:00.000Z`) : new Date()
    if (!selectedDateISO) today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const orders = await db.order.findMany({
      where: {
        courierId: user.id,
        deliveryDate: {
          gte: today,
          lt: tomorrow
        },
        orderStatus: {
          not: 'FAILED'
        },
        deletedAt: null
      },
      orderBy: {
        deliveryTime: 'asc'
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      }
    })

    const [disabledDates, disabledCourierDates] = await Promise.all([
      getDisabledResourceDates('CLIENT', [...new Set(orders.map((order) => order.customerId))], today, tomorrow),
      getDisabledResourceDates('COURIER', [user.id], today, tomorrow),
    ])
    const courierDisabled = disabledCourierDates.get(user.id)
    const effectiveOrders = orders.filter((order) => {
      if (!order.deliveryDate) return true
      const dateKey = toAvailabilityDateKey(order.deliveryDate)
      return !disabledDates.get(order.customerId)?.has(dateKey) && !courierDisabled?.has(dateKey)
    })
    return NextResponse.json(effectiveOrders)

  } catch (error) {
    console.error('Error fetching courier route:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
