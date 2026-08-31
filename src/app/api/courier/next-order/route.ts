import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { filterRowsOnContractOverrides } from '@/lib/admin/contract-effective'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const candidateOrders = await db.order.findMany({
      where: {
        courierId: user.id,
        deletedAt: null,
        orderStatus: {
          in: ['PENDING', 'IN_DELIVERY'],
        },
        customer: {
          isActive: true,
          autoOrdersEnabled: true,
        },
        deliveryDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      orderBy: {
        deliveryTime: 'asc',
      },
      take: 100,
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

    const rangeStart = new Date()
    rangeStart.setHours(0, 0, 0, 0)
    const rangeEnd = new Date(rangeStart)
    rangeEnd.setDate(rangeEnd.getDate() + 8)
    rangeEnd.setHours(23, 59, 59, 999)
    const [disabledDates, disabledCourierDates] = await Promise.all([
      getDisabledResourceDates('CLIENT', [...new Set(candidateOrders.map((order) => order.customerId))], rangeStart, rangeEnd),
      getDisabledResourceDates('COURIER', [user.id], rangeStart, rangeEnd),
    ])
    const courierDisabled = disabledCourierDates.get(user.id)
    const contractEffective = await filterRowsOnContractOverrides(candidateOrders, rangeStart, rangeEnd)
    const nextOrder = contractEffective.find((order) => {
      if (!order.deliveryDate) return true
      const dateKey = toAvailabilityDateKey(order.deliveryDate)
      return !disabledDates.get(order.customerId)?.has(dateKey) && !courierDisabled?.has(dateKey)
    })

    if (!nextOrder) {
      return NextResponse.json({ message: 'No active orders' })
    }

    const transformedOrder = {
      ...nextOrder,
      customerName: nextOrder.customer?.name || 'Unknown customer',
      customerPhone: nextOrder.customer?.phone || '',
      customer: {
        name: nextOrder.customer?.name || 'Unknown customer',
        phone: nextOrder.customer?.phone || '',
      },
      deliveryDate: nextOrder.deliveryDate
        ? new Date(nextOrder.deliveryDate).toISOString().split('T')[0]
        : new Date(nextOrder.createdAt).toISOString().split('T')[0],
      isAutoOrder: true,
    }

    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error('Error fetching next order:', error)
    return NextResponse.json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
    }, { status: 500 })
  }
}

