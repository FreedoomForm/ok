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

        const totalDelivered = await db.order.count({
            where: {
                courierId: user.id,
                orderStatus: 'DELIVERED'
            }
        })

        const todayDelivered = await db.order.count({
            where: {
                courierId: user.id,
                orderStatus: 'DELIVERED',
                deliveredAt: {
                    gte: today
                }
            }
        })

        return NextResponse.json({
            totalDelivered,
            todayDelivered
        })

    } catch (error) {
        console.error('Error fetching courier stats:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
