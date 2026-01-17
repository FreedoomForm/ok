import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { clientIds, isActive } = body

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Не указаны ID клиентов' }, { status: 400 })
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Не указан статус активности' }, { status: 400 })
    }

    // Update clients in database
    let updatedCount = 0
    for (const clientId of clientIds) {
      try {
        // Update in database
        const updatedClient = await db.customer.update({
          where: { id: clientId },
          data: { isActive }
        })

        if (updatedClient) {
          updatedCount++
          console.log(`✅ Updated client ${updatedClient.name} status to ${isActive ? 'active' : 'inactive'}`)
        }
      } catch (error) {
        console.error(`❌ Error updating client ${clientId}:`, error)
      }
    }

    return NextResponse.json({
      message: `Статус ${isActive ? 'возобновлен' : 'приостановлен'} для ${updatedCount} клиентов`,
      updatedCount
    })

  } catch (error) {
    console.error('Error toggling client status:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}