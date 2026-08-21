import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { filterCustomerIdsInGroup, getGroupAdminIds } from '@/lib/admin-scope'
import {
    buildClientBulkUpdateData,
    clientBulkUpdateSchema,
} from '@/lib/admin/clients'

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        let requestBody: unknown
        try {
            requestBody = await request.json()
        } catch {
            return NextResponse.json({ error: 'Некорректный JSON запроса' }, { status: 400 })
        }

        const parsedBody = clientBulkUpdateSchema.safeParse(requestBody)
        if (!parsedBody.success) {
            return NextResponse.json({
                error: 'Некорректные данные массового обновления клиентов',
                details: parsedBody.error.flatten(),
            }, { status: 400 })
        }

        const { clientIds, updates } = parsedBody.data
        const updateData = buildClientBulkUpdateData(updates)

        const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
        const allowedIds = groupAdminIds ? await filterCustomerIdsInGroup(clientIds, groupAdminIds) : clientIds
        const skippedCount = clientIds.length - allowedIds.length

        const result = await db.customer.updateMany({
            where: {
                id: {
                    in: allowedIds
                }
            },
            data: updateData
        })

        return NextResponse.json({
            message: 'Клиенты успешно обновлены',
            updatedCount: result.count,
            skippedCount
        })

    } catch (error) {
        console.error('Bulk update clients error:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
