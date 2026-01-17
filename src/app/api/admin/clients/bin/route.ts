import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        // Get deleted clients (where deletedAt is not null)
        const deletedClients = await db.customer.findMany({
            where: {
                deletedAt: {
                    not: null
                }
            },
            orderBy: { deletedAt: 'desc' }
        })

        // Transform to include necessary info
        const binClients = deletedClients.map(client => ({
            id: client.id,
            name: client.name,
            phone: client.phone,
            address: client.address,
            isActive: client.isActive,
            deletedAt: client.deletedAt?.toISOString(),
            deletedBy: client.deletedBy,
            createdAt: client.createdAt.toISOString()
        }))

        return NextResponse.json(binClients)

    } catch (error) {
        console.error('Error fetching bin:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
