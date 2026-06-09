import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

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

    return NextResponse.json(orders)

  } catch (error) {
    console.error('Error fetching courier route:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
