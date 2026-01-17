import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let where: any = {}

        if (user.role === 'SUPER_ADMIN') {
            // Super Admin sees everyone
            where = {}
        } else if (user.role === 'MIDDLE_ADMIN') {
            // Middle Admin sees themselves and users they created
            where = {
                OR: [
                    { id: user.id },
                    { createdBy: user.id }
                ]
            }
        } else {
            // Others see only themselves
            where = { id: user.id }
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
