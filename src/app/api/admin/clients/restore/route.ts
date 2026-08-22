import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { clientIdSchema } from '@/lib/admin/clients'
import { z } from 'zod'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = z.object({ clientIds: z.array(clientIdSchema).min(1).max(500) }).safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Не указаны ID клиентов для восстановления' }, { status: 400 })
        }

        const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
        const clientIds = [...new Set(parsed.data.clientIds)]

        try {
            const deletedClients = await db.customer.findMany({
                where: { id: { in: clientIds }, deletedAt: { not: null } },
                select: { id: true, createdBy: true },
            })
            const scopedClientIds = groupAdminIds
                ? deletedClients.filter((client) => client.createdBy && groupAdminIds.includes(client.createdBy)).map((client) => client.id)
                : deletedClients.map((client) => client.id)
            const skippedCount = groupAdminIds
                ? deletedClients.filter((client) => !client.createdBy || !groupAdminIds.includes(client.createdBy)).length
                : 0
            const restoredClients = (await db.customer.updateMany({
                where: { id: { in: scopedClientIds }, deletedAt: { not: null } },
                data: { deletedAt: null, deletedBy: null },
            })).count

            return NextResponse.json({
                success: true,
                restoredClients,
                skippedCount,
                message: `Успешно восстановлено: ${restoredClients} клиентов`
            })

        } catch (error) {
            console.error('Restore clients error:', error)
            return NextResponse.json({
                error: 'Ошибка при восстановлении',
                ...(process.env.NODE_ENV === 'development' && {
                    details: error instanceof Error ? error.message : 'Неизвестная ошибка'
                })
            }, { status: 500 })
        }

    } catch (error) {
        console.error('Restore clients API error:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && {
                details: error instanceof Error ? error.message : 'Неизвестная ошибка'
            })
        }, { status: 500 })
    }
}
