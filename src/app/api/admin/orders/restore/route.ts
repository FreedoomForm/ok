import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
        }

        const { orderIds } = await request.json()

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'Не выбраны заказы для восстановления' }, { status: 400 })
        }

        const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

        const eligibleOrders = await db.order.findMany({
            where: {
                id: { in: orderIds },
                ...(groupAdminIds ? { adminId: { in: groupAdminIds } } : {})
            },
            select: { id: true }
        })
        const eligibleOrderIds = eligibleOrders.map(o => o.id)
        const skippedCount = orderIds.length - eligibleOrderIds.length

        const result = await db.order.updateMany({
            where: { id: { in: eligibleOrderIds } },
            data: { deletedAt: null }
        })

        return NextResponse.json({
            message: 'Заказы успешно восстановлены',
            updatedCount: result.count,
            skippedCount
        })
    } catch (error) {
        console.error('Error restoring orders:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
