import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['COURIER'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const body = await request.json()
        const { latitude, longitude } = body

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return NextResponse.json({ error: 'Некорректные координаты' }, { status: 400 })
        }

        await db.admin.update({
            where: { id: user.id },
            data: {
                latitude,
                longitude
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating location:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
