import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const body = await request.json()
        const { orderIds, updates } = body

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'Не указаны ID заказов' }, { status: 400 })
        }

        if (!updates || Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Не указаны данные для обновления' }, { status: 400 })
        }

        // Prepare update data
        const updateData: any = {}

        if (updates.orderStatus) updateData.orderStatus = updates.orderStatus
        if (updates.paymentStatus) updateData.paymentStatus = updates.paymentStatus
        if (updates.courierId) updateData.courierId = updates.courierId === 'none' ? null : updates.courierId
        if (updates.deliveryDate) updateData.deliveryDate = new Date(updates.deliveryDate)

        // Update orders
        const result = await db.order.updateMany({
            where: {
                id: {
                    in: orderIds
                }
            },
            data: updateData
        })

        return NextResponse.json({
            message: 'Заказы успешно обновлены',
            updatedCount: result.count
        })

    } catch (error) {
        console.error('Bulk update orders error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
