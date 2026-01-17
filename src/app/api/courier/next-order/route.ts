import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const nextOrder = await db.order.findFirst({
      where: {
        courierId: user.id,
        orderStatus: {
          in: ['PENDING', 'IN_DELIVERY']
        },
        deliveryDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
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

    if (!nextOrder) {
      return NextResponse.json({ message: 'Нет активных заказов' })
    }

    // Cast to any to avoid TS issues with included relation
    const orderWithCustomer = nextOrder as any

    const transformedOrder = {
      ...nextOrder,
      customerName: orderWithCustomer.customer?.name || 'Неизвестный клиент',
      customerPhone: orderWithCustomer.customer?.phone || 'Нет телефона',
      customer: {
        name: orderWithCustomer.customer?.name || 'Неизвестный клиент',
        phone: orderWithCustomer.customer?.phone || 'Нет телефона'
      },
      deliveryDate: nextOrder.deliveryDate ? new Date(nextOrder.deliveryDate).toISOString().split('T')[0] : new Date(nextOrder.createdAt).toISOString().split('T')[0],
      isAutoOrder: true
    }

    return NextResponse.json(transformedOrder)

  } catch (error) {
    console.error('Error fetching next order:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
