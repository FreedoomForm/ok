import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { parseBoundedPagination } from '@/lib/pagination'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const pagination = parseBoundedPagination(searchParams.get('limit'), searchParams.get('offset'))
        let where: Prisma.AdminWhereInput = {}

        if (user.role === 'SUPER_ADMIN') {
            where = {}
        } else {
            const groupAdminIds = await getGroupAdminIds(user)
            const allowedIds = groupAdminIds ?? [user.id]
            where = { id: { in: allowedIds } }
        }

        const [users, total] = await Promise.all([
            db.admin.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    role: true
                },
                orderBy: { name: 'asc' },
                ...(pagination ? { take: pagination.limit, skip: pagination.offset } : {})
            }),
            pagination ? db.admin.count({ where }) : Promise.resolve(null)
        ])

        const response = NextResponse.json({ users })
        if (pagination && total !== null) {
            response.headers.set('X-Users-Total', String(total))
            response.headers.set('X-Users-Offset', String(pagination.offset))
            response.headers.set('X-Users-Limit', String(pagination.limit))
            response.headers.set('X-Users-Has-More', String(pagination.offset + users.length < total))
        }

        return response
    } catch (error) {
        console.error('Error fetching users list:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
