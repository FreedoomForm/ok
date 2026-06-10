import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus, Prisma } from '@prisma/client'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { listCustomerOrders } from '@/modules/sites'
import { AppError } from '@/modules/shared/errors'

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateParam = searchParams.get('date')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const where: Prisma.OrderWhereInput = {
      customerId: customer.id,
      deletedAt: null,
    }

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.orderStatus = status as OrderStatus
    }

    // Optional date filtering
    const startEnd = (() => {
      const parseDay = (raw: string) => {
        const d = new Date(raw)
        if (Number.isNaN(d.getTime())) return null
        const start = new Date(d)
        start.setHours(0, 0, 0, 0)
        const end = new Date(d)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }

      if (dateParam) return parseDay(dateParam)

      const start = fromParam ? new Date(fromParam) : null
      const end = toParam ? new Date(toParam) : null
      const hasStart = start && !Number.isNaN(start.getTime())
      const hasEnd = end && !Number.isNaN(end.getTime())
      if (!hasStart && !hasEnd) return null

      const normalizedStart = hasStart ? new Date(start!) : null
      const normalizedEnd = hasEnd ? new Date(end!) : null
      if (normalizedStart) normalizedStart.setHours(0, 0, 0, 0)
      if (normalizedEnd) normalizedEnd.setHours(23, 59, 59, 999)
      return { start: normalizedStart, end: normalizedEnd }
    })()

    if (startEnd) {
      const deliveryDate: Prisma.DateTimeFilter = {}
      const createdAt: Prisma.DateTimeFilter = {}

      if (startEnd.start) {
        deliveryDate.gte = startEnd.start
        createdAt.gte = startEnd.start
      }
      if (startEnd.end) {
        deliveryDate.lte = startEnd.end
        createdAt.lte = startEnd.end
      }

      where.OR = [
        { deliveryDate },
        { deliveryDate: null, createdAt },
      ]
    }

    const orders = await listCustomerOrders(customer.id, where)
    return NextResponse.json({ data: orders })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
