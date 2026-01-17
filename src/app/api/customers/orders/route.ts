import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'

export async function GET(request: NextRequest) {
    try {
        const customer = await getCustomerFromRequest(request)
        if (!customer) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const where: any = {
            customerId: customer.id,
            deletedAt: null
        }

        if (status) {
            where.orderStatus = status
        }

        const orders = await db.order.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                courier: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        })

        return NextResponse.json(orders)

    } catch (error) {
        console.error('Error fetching customer orders:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
