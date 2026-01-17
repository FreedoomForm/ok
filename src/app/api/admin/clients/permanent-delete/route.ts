import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const body = await request.json()
        const { clientIds } = body

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return NextResponse.json({ error: 'Не указаны ID клиентов для удаления' }, { status: 400 })
        }

        let deletedClients = 0
        let deletedOrders = 0

        for (const clientId of clientIds) {
            try {
                // Delete all orders for this client
                const deletedOrdersResult = await db.order.deleteMany({
                    where: { customerId: clientId }
                })
                deletedOrders += deletedOrdersResult.count

                // Permanently delete the client
                const deletedClient = await db.customer.delete({
                    where: { id: clientId }
                })

                if (deletedClient) {
                    deletedClients++
                    console.log(`✅ Permanently deleted client ${deletedClient.name}`)
                }

            } catch (dbError) {
                console.error(`❌ Error permanently deleting client ${clientId}:`, dbError)
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
