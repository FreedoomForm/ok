import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let where: any = {}

        if (user.role === 'SUPER_ADMIN') {
            where = {}
        } else {
            const groupAdminIds = await getGroupAdminIds(user)
            const allowedIds = groupAdminIds ?? [user.id]
            where = { id: { in: allowedIds } }
        }

        const users = await db.admin.findMany({
            where,
            select: {
                id: true,
                name: true,
                role: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ users })
    } catch (error) {
        console.error('Error fetching users list:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
