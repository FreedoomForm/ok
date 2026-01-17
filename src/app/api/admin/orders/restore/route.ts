import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
        }

        const { orderIds } = await request.json()

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'Не выбраны заказы для восстановления' }, { status: 400 })
        }

        const result = await db.order.updateMany({
            where: {
                id: { in: orderIds }
            },
            data: {
                deletedAt: null
            }
        })

        return NextResponse.json({
            message: 'Заказы успешно восстановлены',
            updatedCount: result.count
        })
    } catch (error) {
        console.error('Error restoring orders:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
