import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { OrderEventType } from '@prisma/client'
import { appendOrderAudit, getStatusTimestampPatch } from '@/lib/order-audit'

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['COURIER'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const { id: orderId } = await context.params
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: {
                customer: { select: { dailyPrice: true } },
            },
        })

        if (!order) {
            return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
        }

        if (order.courierId !== user.id) {
            return NextResponse.json({ error: 'Это не ваш заказ' }, { status: 403 })
        }

        if (order.orderStatus === 'DELIVERED') {
            return NextResponse.json({ error: 'Заказ уже доставлен' }, { status: 409 })
        }

        const financeAdminId = (await getOwnerAdminId(user)) ?? user.id
        const dailyPrice = order.customer.dailyPrice || 84000
        const totalOrderCost = dailyPrice * (order.quantity || 1)
        const paymentStatus = (order.amountReceived ?? 0) >= totalOrderCost ? 'PAID' : order.paymentStatus

        const updatedOrder = await db.$transaction(async (tx) => {
            const updateResult = await tx.order.updateMany({
                where: {
                    id: orderId,
                    courierId: user.id,
                    orderStatus: { not: 'DELIVERED' },
                },
                data: {
                    orderStatus: 'DELIVERED',
                    paymentStatus,
                    ...getStatusTimestampPatch('DELIVERED'),
                },
            })

            if (updateResult.count !== 1) return null

            await tx.transaction.create({
                data: {
                    amount: dailyPrice,
                    type: 'EXPENSE',
                    category: 'MEAL_DEDUCTION',
                    description: `Списание за дневной рацион (Заказ #${order.orderNumber})`,
                    adminId: financeAdminId,
                    customerId: order.customerId,
                },
            })
            await tx.customer.update({
                where: { id: order.customerId },
                data: { balance: { decrement: dailyPrice } },
            })

            const current = await tx.order.findUnique({ where: { id: orderId } })
            if (!current) return null

            await appendOrderAudit(tx, {
                orderId,
                eventType: OrderEventType.DELIVERY_COMPLETED,
                actorAdminId: user.id,
                actorRole: user.role,
                nextStatus: current.orderStatus,
                message: 'Courier completed delivery through legacy endpoint',
            })

            return current
        })

        if (!updatedOrder) {
            return NextResponse.json({ error: 'Заказ уже изменён другим запросом' }, { status: 409 })
        }

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error('Error completing order:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
