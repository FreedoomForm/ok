import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { adminLifecycleSchema, buildAdminLifecycleData, canManageAdminLifecycle } from '@/lib/admin/admin-lifecycle'
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
        const search = searchParams.get('search')?.trim().slice(0, 120) ?? ''
        const pagination = parseBoundedPagination(searchParams.get('limit'), searchParams.get('offset'))
        let where: Prisma.AdminWhereInput = {}

        if (user.role === 'SUPER_ADMIN') {
            where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}
        } else {
            const groupAdminIds = await getGroupAdminIds(user)
            const allowedIds = groupAdminIds ?? [user.id]
            where = search
                ? { id: { in: allowedIds }, OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
                : { id: { in: allowedIds } }
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


export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        const parsed = adminLifecycleSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success || parsed.data.id === user.id) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
        const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
        const target = await db.admin.findFirst({
            where: { id: parsed.data.id, ...(groupAdminIds ? { id: { in: groupAdminIds } } : {}) },
            select: { id: true, role: true, createdBy: true, isActive: true, deletedAt: true },
        })
        if (!target || !canManageAdminLifecycle(user, target)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        const updated = await db.admin.update({ where: { id: target.id }, data: buildAdminLifecycleData(parsed.data), select: { id: true, isActive: true, deletedAt: true } })
        await db.actionLog.create({ data: { adminId: user.id, action: parsed.data.deletedAt === true ? 'DELETE_ADMIN' : parsed.data.deletedAt === false ? 'RESTORE_ADMIN' : parsed.data.isActive ? 'ENABLE_ADMIN' : 'DISABLE_ADMIN', entityType: 'ADMIN', entityId: target.id, details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'ADMIN_LIFECYCLE', entity: 'ADMIN' } }), oldValues: JSON.stringify({ isActive: target.isActive, deletedAt: target.deletedAt }), newValues: JSON.stringify({ isActive: updated.isActive, deletedAt: updated.deletedAt }) } })
        return NextResponse.json({ admin: updated })
    } catch (error) {
        console.error('Error updating admin lifecycle:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
