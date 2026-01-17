import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['COURIER'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const orderId = params.id

        const order = await db.order.findUnique({
            where: { id: orderId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
        }

        if (order.courierId !== user.id) {
            return NextResponse.json({ error: 'Это не ваш заказ' }, { status: 403 })
        }

        const updatedOrder = await db.order.update({
            where: { id: orderId },
            data: {
                orderStatus: 'FAILED'
            }
        })

        return NextResponse.json(updatedOrder)

    } catch (error) {
        console.error('Error failing order:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
