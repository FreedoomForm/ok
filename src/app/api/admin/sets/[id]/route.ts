import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'

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
            select: { id: true, adminId: true }
        })

        if (!existingSet) {
            return NextResponse.json({ error: 'Set not found' }, { status: 404 })
        }

        if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()

        // Allowed fields to update
        const { name, description, calorieGroups, isActive } = body

        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (calorieGroups !== undefined) updateData.calorieGroups = calorieGroups
        if (isActive !== undefined) {
            updateData.isActive = isActive

            // If activating this set, we might want to deactivate others?
            if (isActive) {
                await db.menuSet.updateMany({
                    where: { id: { not: id }, adminId: existingSet.adminId },
                    data: { isActive: false }
                })
            }
        }

        const updatedSet = await db.menuSet.update({
            where: { id },
            data: updateData
        })

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
            select: { id: true, adminId: true }
        })

        if (!existingSet) {
            return NextResponse.json({ error: 'Set not found' }, { status: 404 })
        }

        if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await db.menuSet.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting set:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
