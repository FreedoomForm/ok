import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

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

    let dateFilter: Record<string, any> = {}
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
      const deliveryDate: Record<string, Date> = {}

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

    const orders = await db.order.findMany({
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

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching courier orders:', error)
    return NextResponse.json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
    }, { status: 500 })
  }
}

