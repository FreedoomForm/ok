import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { setUpdateSchema } from '@/lib/admin/sets'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const set = await db.menuSet.findUnique({
            where: { id }
        })

        if (!set) {
            return NextResponse.json({ error: 'Set not found' }, { status: 404 })
        }

        if (user.role === 'MIDDLE_ADMIN') {
            if (set.adminId !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        } else if (user.role === 'LOW_ADMIN') {
            const ownerAdminId = await getOwnerAdminId(user)
            if (!ownerAdminId || set.adminId !== ownerAdminId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        } else if (user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json(set)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await context.params
        const existingSet = await db.menuSet.findUnique({
            where: { id },
            select: { id: true, adminId: true, isActive: true, deletedAt: true }
        })

        if (!existingSet) {
            return NextResponse.json({ error: 'Set not found' }, { status: 404 })
        }

        if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const validation = setUpdateSchema.safeParse(await request.json().catch(() => null))
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid set update data' }, { status: 400 })
        }

        const { name, description, calorieGroups, isActive, deletedAt } = validation.data
        const updateData = {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(calorieGroups !== undefined ? { calorieGroups } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
            ...(deletedAt === undefined ? {} : { deletedAt: deletedAt ? new Date() : null, isActive: deletedAt ? false : isActive ?? true }),
        }
        if (isActive === true) {
            await db.menuSet.updateMany({
                where: { id: { not: id }, adminId: existingSet.adminId },
                data: { isActive: false }
            })
        }

        const updatedSet = await db.menuSet.update({
            where: { id },
            data: updateData
        })
        try {
            await db.actionLog.create({
                data: {
                    adminId: user.id,
                    action: deletedAt === true ? 'DELETE_SET' : deletedAt === false ? 'RESTORE_SET' : 'UPDATE_SET',
                    entityType: 'SET',
                    entityId: updatedSet.id,
                    oldValues: JSON.stringify({ isActive: existingSet.isActive, deletedAt: existingSet.deletedAt }),
                    newValues: JSON.stringify({ isActive: updatedSet.isActive, deletedAt: updatedSet.deletedAt }),
                },
            })
        } catch (logError) {
            console.error('Failed to log set action:', logError)
        }
        return NextResponse.json(updatedSet)
    } catch (error) {
        console.error('Error updating set:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await context.params

        const existingSet = await db.menuSet.findUnique({
            where: { id },
            select: { id: true, adminId: true, isActive: true, deletedAt: true }
        })

        if (!existingSet) {
            return NextResponse.json({ error: 'Set not found' }, { status: 404 })
        }

        if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updatedSet = await db.menuSet.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        })
        try {
            await db.actionLog.create({
                data: {
                    adminId: user.id,
                    action: 'DELETE_SET',
                    entityType: 'SET',
                    entityId: updatedSet.id,
                    oldValues: JSON.stringify({ isActive: existingSet.isActive, deletedAt: existingSet.deletedAt }),
                    newValues: JSON.stringify({ isActive: updatedSet.isActive, deletedAt: updatedSet.deletedAt }),
                },
            })
        } catch (logError) {
            console.error('Failed to log set deletion:', logError)
        }
        return NextResponse.json({ success: true, set: updatedSet })
    } catch (error) {
        console.error('Error deleting set:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
