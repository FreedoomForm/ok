import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { z } from 'zod'

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = z.object({
      orderIds: z.array(z.string().trim().min(1).max(128)).min(1).max(500),
    }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Order IDs are required' }, { status: 400 })
    }
    const { orderIds } = parsed.data

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

    // Soft delete orders (set deletedAt timestamp)
    const updateResult = await db.order.updateMany({
      where: { id: { in: eligibleOrderIds } },
      data: { deletedAt: new Date() }
    })

    const deletedCount = updateResult.count

    return NextResponse.json({
      message: 'Orders moved to bin successfully',
      deletedCount,
      skippedCount
    })

  } catch (error) {
    console.error('Delete orders error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}
