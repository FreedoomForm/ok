import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { passwordSchema } from '@/lib/validations'
import { z } from 'zod'
import { safeJsonParse } from '@/lib/safe-json'

// PATCH - Update admin
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
        }

        const { id } = await context.params
        const data = await request.json()
        const hasAllowedTabs = Object.prototype.hasOwnProperty.call(data, 'allowedTabs')

        const validTabs = [
            'orders',
            'clients',
            'admins',
            'bin',
            'statistics',
            'history',
            'profile',
            'warehouse',
            'finance',
            'interface',
            // legacy aliases
            'chat',
            'settings'
        ]

        if (hasAllowedTabs) {
            if (data.allowedTabs != null && !Array.isArray(data.allowedTabs)) {
                return NextResponse.json({ error: 'Invalid allowedTabs' }, { status: 400 })
            }
            if (Array.isArray(data.allowedTabs) && data.allowedTabs.some((tab: string) => !validTabs.includes(tab))) {
                return NextResponse.json({ error: 'Invalid allowedTabs values' }, { status: 400 })
            }
        }

        // Verify target admin exists and user has permission to edit them
        const targetAdmin = await db.admin.findUnique({
            where: { id }
        })

        if (!targetAdmin) {
            return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
        }

        // Middle admin can only edit admins they created
        if (user.role === 'MIDDLE_ADMIN' && targetAdmin.createdBy !== user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
        }

        const updateData: any = {}

        if (data.name) updateData.name = data.name
        if (data.email) updateData.email = data.email
        if (data.role) updateData.role = data.role
        if (data.isActive !== undefined) updateData.isActive = data.isActive
        if (hasAllowedTabs) {
            updateData.allowedTabs =
                Array.isArray(data.allowedTabs) && data.allowedTabs.length > 0
                    ? JSON.stringify(data.allowedTabs)
                    : null
        }
        if (data.salary !== undefined) updateData.salary = data.salary

        if (data.password) {
            // Validate password strength
            try {
                passwordSchema.parse(data.password)
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
                }
            }
            updateData.password = await bcrypt.hash(data.password, 10)
            updateData.hasPassword = true
        }

        const updatedAdmin = await db.admin.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                allowedTabs: true,
                createdAt: true,
                salary: true
            }
        })

        // Log action
        await db.actionLog.create({
            data: {
                adminId: user.id,
                action: 'UPDATE_ADMIN',
                entityType: 'ADMIN',
                entityId: id,
                description: `Updated admin ${updatedAdmin.name}`
            }
        })

        return NextResponse.json({
            ...updatedAdmin,
            allowedTabs: (() => {
                const parsed = safeJsonParse<unknown>(updatedAdmin.allowedTabs, [])
                return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
            })()
        })

    } catch (error) {
        console.error('Error updating admin:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}

// DELETE - Delete admin
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
        }

        const { id } = await context.params

        // Verify target admin exists and user has permission to delete them
        const targetAdmin = await db.admin.findUnique({
            where: { id }
        })

        if (!targetAdmin) {
            return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
        }

        // Middle admin can only delete admins they created
        if (user.role === 'MIDDLE_ADMIN' && targetAdmin.createdBy !== user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
        }

        await db.admin.delete({
            where: { id }
        })

        // Log action
        await db.actionLog.create({
            data: {
                adminId: user.id,
                action: 'DELETE_ADMIN',
                entityType: 'ADMIN',
                entityId: id,
                description: `Deleted admin ${targetAdmin.name}`
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error deleting admin:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
