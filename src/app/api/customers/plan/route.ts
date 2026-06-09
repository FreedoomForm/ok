import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'

function startOfToday() {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  return dayStart
}

const PAUSE_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PENDING,
  OrderStatus.IN_PROCESS,
  OrderStatus.IN_DELIVERY,
]

export async function PATCH(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const active = typeof body.active === 'boolean' ? body.active : null

    if (active === null) {
      return NextResponse.json({ error: '`active` boolean is required' }, { status: 400 })
    }

    const updatedCustomer = await db.customer.update({
      where: { id: customer.id },
      data: { autoOrdersEnabled: active },
      select: { id: true, autoOrdersEnabled: true },
    })

    const todayStart = startOfToday()
    const dateScope = {
      OR: [
        { deliveryDate: { gte: todayStart } },
        { deliveryDate: { equals: null }, createdAt: { gte: todayStart } }
      ]
    }

    if (!active) {
      // Pause all orders from today so they won't be dispatched/delivered.
      await db.order.updateMany({
        where: {
          customerId: customer.id,
          deletedAt: null,
          ...dateScope,
          orderStatus: { in: PAUSE_STATUSES },
        },
        data: { orderStatus: OrderStatus.PAUSED },
      })
    } else {
      // Resume paused orders from today.
      await db.order.updateMany({
        where: {
          customerId: customer.id,
          deletedAt: null,
          ...dateScope,
          orderStatus: OrderStatus.PAUSED,
        },
        data: { orderStatus: OrderStatus.NEW },
      })
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
