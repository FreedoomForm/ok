import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { orderIds } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Order IDs are required' }, { status: 400 })
    }

    // Soft delete orders (set deletedAt timestamp)
    const updateResult = await db.order.updateMany({
      where: {
        id: {
          in: orderIds
        }
      },
      data: {
        deletedAt: new Date()
      }
    })

    const deletedCount = updateResult.count

    console.log(`Soft deleted ${deletedCount} orders by ${user.role} ${user.email}`)

    return NextResponse.json({
      message: 'Orders moved to bin successfully',
      deletedCount
    })

  } catch (error) {
    console.error('Delete orders error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}