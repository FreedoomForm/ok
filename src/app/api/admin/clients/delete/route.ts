import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { clientIds } = body

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Не указаны ID клиентов для удаления' }, { status: 400 })
    }

    let movedTobin = 0
    let deletedOrders = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      // Process each client
      for (const clientId of clientIds) {
        try {
          // Get client to check if active
          const client = await db.customer.findUnique({
            where: { id: clientId }
          })

          if (!client) {
            console.log(`⚠️ Client ${clientId} not found`)
            continue
          }

          // If client is active, delete future auto-generated orders from today onwards
          if (client.isActive) {
            const deletedOrdersResult = await db.order.deleteMany({
              where: {
                customerId: clientId,
                isAutoOrder: true,
                deliveryDate: {
                  gte: today
                }
              }
            })
            deletedOrders += deletedOrdersResult.count
            console.log(`✅ Deleted ${deletedOrdersResult.count} future auto orders for active client ${client.name}`)
          } else {
            // If inactive, preserve all orders
            console.log(`ℹ️ Preserving all orders for inactive client ${client.name}`)
          }

          // Soft delete the client (set deletedAt timestamp)
          await db.customer.update({
            where: { id: clientId },
            data: {
              deletedAt: new Date(),
              deletedBy: user.id
            }
          })

          movedTobin++
          console.log(`✅ Moved client ${client.name} to bin`)

        } catch (dbError) {
          console.error(`❌ Error processing client ${clientId}:`, dbError)
        }
      }

      return NextResponse.json({
        success: true,
        movedTobin,
        deletedOrders,
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