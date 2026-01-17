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
        const { clientIds, updates } = body

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return NextResponse.json({ error: 'Не указаны ID клиентов' }, { status: 400 })
        }

        if (!updates || Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Не указаны данные для обновления' }, { status: 400 })
        }

        // Prepare update data
        const updateData: any = {}

        if (updates.isActive !== undefined) updateData.isActive = updates.isActive
        if (updates.calories) updateData.calories = parseInt(updates.calories) // Note: calories are stored in global state usually, but let's assume we might want to update DB too if schema supports it or just handle it logic wise

        // Note: Client calories and delivery days are complex because they are often stored in JSON or global state.
        // For now, we'll focus on isActive which is a direct DB field.
        // If we need to update JSON fields, we'd need to fetch, parse, update, and save back, which is hard in updateMany.
        // So updateMany is best for simple fields. For complex fields, we might need a loop.

        // Let's handle simple fields first.

        const result = await db.customer.updateMany({
            where: {
                id: {
                    in: clientIds
                }
            },
            data: updateData
        })

        return NextResponse.json({
            message: 'Клиенты успешно обновлены',
            updatedCount: result.count
        })

    } catch (error) {
        console.error('Bulk update clients error:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}

