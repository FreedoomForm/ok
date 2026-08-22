import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { clientIdSchema } from '@/lib/admin/clients'
import { z } from 'zod'

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = z.object({ clientIds: z.array(clientIdSchema).min(1).max(500) }).safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Не указаны ID клиентов для удаления' }, { status: 400 })
        }

        const { clientIds } = parsed.data
        const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
        const eligibleClientIds = groupAdminIds
            ? (await db.customer.findMany({
                where: { id: { in: clientIds }, createdBy: { in: groupAdminIds } },
                select: { id: true },
            })).map((client) => client.id)
            : clientIds

        let deletedClients = 0
        let deletedOrders = 0

        for (const clientId of eligibleClientIds) {
            try {
                const result = await db.$transaction(async (tx) => {
                    const deletedOrdersResult = await tx.order.deleteMany({
                        where: { customerId: clientId },
                    })
                    await tx.customer.delete({ where: { id: clientId } })
                    return deletedOrdersResult.count
                })
                deletedOrders += result
                deletedClients += 1
            } catch (dbError) {
                console.error('Error permanently deleting client:', dbError)
            }
        }

        return NextResponse.json({
            success: true,
            deletedClients,
            deletedOrders,
            message: `Успешно удалено навсегда: ${deletedClients} клиентов и ${deletedOrders} заказов`
        })

    } catch (error) {
        console.error('Permanent delete API error:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            details: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }, { status: 500 })
    }
}
