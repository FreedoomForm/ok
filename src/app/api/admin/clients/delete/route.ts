import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { clientIdSchema } from '@/lib/admin/clients'
import { z } from 'zod'

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = z.object({ clientIds: z.array(clientIdSchema).min(1).max(500) }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Не указаны ID клиентов для удаления' }, { status: 400 })
    }
    const { clientIds } = parsed.data

    let movedTobin = 0
    let deletedOrders = 0
    let skippedCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    try {
      // Process each client
      for (const clientId of clientIds) {
        try {
          // Get client to check if active
          const client = await db.customer.findUnique({
            where: { id: clientId },
            select: { createdBy: true, isActive: true },
          })

          if (!client) {
            continue
          }

          if (groupAdminIds && (!client.createdBy || !groupAdminIds.includes(client.createdBy))) {
            skippedCount++
            continue
          }

          const deletedOrderCount = await db.$transaction(async (tx) => {
            const deletedOrdersResult = client.isActive
              ? await tx.order.deleteMany({
                  where: {
                    customerId: clientId,
                    fromAutoOrder: true,
                    deliveryDate: { gte: today },
                  },
                })
              : { count: 0 }

            await tx.customer.update({
              where: { id: clientId },
              data: { deletedAt: new Date(), deletedBy: user.id },
            })
            return deletedOrdersResult.count
          })

          deletedOrders += deletedOrderCount
          movedTobin++

        } catch (dbError) {
          console.error(`❌ Error processing client ${clientId}:`, dbError)
        }
      }

      return NextResponse.json({
        success: true,
        movedTobin,
        deletedOrders,
        skippedCount,
        message: `Успешно перемещено в корзину: ${movedTobin} клиентов. Удалено будущих авто-заказов: ${deletedOrders}`
      })

    } catch (error) {
      console.error('Delete clients error:', error)
      return NextResponse.json({
        error: 'Ошибка при перемещении в корзину',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Неизвестная ошибка'
        })
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Delete clients API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
    }, { status: 500 })
  }
}
