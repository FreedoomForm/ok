import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['COURIER'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get('date')

        let dateFilter = {}
        if (dateParam) {
            const date = new Date(dateParam)
            const start = new Date(date)
            start.setHours(0, 0, 0, 0)
            const end = new Date(date)
            end.setHours(23, 59, 59, 999)

            dateFilter = {
                deliveryDate: {
                    gte: start,
                    lte: end
                }
            }
        }

        const orders = await db.order.findMany({
            where: {
                courierId: user.id,
                deletedAt: null,
                ...dateFilter
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
        console.error('Error fetching courier orders:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
