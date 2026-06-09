import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const nextOrder = await db.order.findFirst({
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

    if (!nextOrder) {
      return NextResponse.json({ message: 'No active orders' })
    }

    // Cast to any to avoid TS issues with included relation
    const orderWithCustomer = nextOrder as any

    const transformedOrder = {
      ...nextOrder,
      customerName: orderWithCustomer.customer?.name || 'Unknown customer',
      customerPhone: orderWithCustomer.customer?.phone || '',
      customer: {
        name: orderWithCustomer.customer?.name || 'Unknown customer',
        phone: orderWithCustomer.customer?.phone || '',
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

