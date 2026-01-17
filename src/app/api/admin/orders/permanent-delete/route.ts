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

        // Permanently delete orders
        const deleteResult = await db.order.deleteMany({
            where: {
                id: {
                    in: orderIds
                }
            }
        })

        const deletedCount = deleteResult.count

        console.log(`Permanently deleted ${deletedCount} orders by ${user.role} ${user.email}`)

        return NextResponse.json({
            message: 'Orders permanently deleted successfully',
            deletedCount
        })

    } catch (error) {
        console.error('Permanent delete orders error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
