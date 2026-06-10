import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { AppError } from '@/modules/shared/errors'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    const { id } = await context.params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        courier: {
          select: {
            name: true,
            phone: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found' } }, { status: 404 })
    }

    if (order.customerId !== customer.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    console.error('Error fetching order details:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
