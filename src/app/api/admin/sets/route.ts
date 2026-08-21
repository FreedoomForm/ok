import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { parseBoundedPagination } from '@/lib/pagination'
import {
    buildInitialCalorieGroups,
    buildMenuSetWhere,
    setCreateSchema,
} from '@/lib/admin/sets'

// GET - Fetch all sets
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const requestedAdminId = searchParams.get('adminId')
        const pagination = parseBoundedPagination(searchParams.get('limit'), searchParams.get('offset'))

        let ownerAdminId: string | null = null
        if (user.role === 'MIDDLE_ADMIN') {
            ownerAdminId = user.id
        } else if (user.role === 'LOW_ADMIN') {
            ownerAdminId = await getOwnerAdminId(user)
        } else if (user.role === 'SUPER_ADMIN') {
            ownerAdminId = requestedAdminId
        }

        if (user.role !== 'SUPER_ADMIN' && !ownerAdminId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const where = buildMenuSetWhere(ownerAdminId)

        const [sets, total] = await Promise.all([
            db.menuSet.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                ...(pagination ? { take: pagination.limit, skip: pagination.offset } : {})
            }),
            pagination ? db.menuSet.count({ where }) : Promise.resolve(null)
        ])

        const response = NextResponse.json(sets)
        if (pagination && total !== null) {
            response.headers.set('X-Sets-Total', String(total))
            response.headers.set('X-Sets-Offset', String(pagination.offset))
            response.headers.set('X-Sets-Limit', String(pagination.limit))
            response.headers.set('X-Sets-Has-More', String(pagination.offset + sets.length < total))
        }

        return response
    } catch (error) {
        console.error('Error fetching sets:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Create a new set
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const validation = setCreateSchema.safeParse(await request.json().catch(() => null))
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid set data' }, { status: 400 })
        }
        const { name, description } = validation.data
        const initialCalorieGroups = buildInitialCalorieGroups()

        const newSet = await db.menuSet.create({
            data: {
                name,
                description,
                menuNumber: 0, // 0 indicates a "Global" set containing all days
                calorieGroups: initialCalorieGroups,
                isActive: false, // Inactive by default
                adminId: user.id
            }
        })

        return NextResponse.json(newSet, { status: 201 })
    } catch (error) {
        console.error('Error creating set:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
