import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const website = await db.website.findUnique({
            where: { adminId: user.id }
        })

        if (!website) {
            return NextResponse.json(null)
        }

        return NextResponse.json(website)

    } catch (error) {
        console.error('Error fetching website:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
