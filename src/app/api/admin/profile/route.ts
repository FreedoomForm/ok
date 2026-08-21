import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { hash } from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { adminProfileUpdateSchema } from '@/lib/admin/profile'

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
        }
        if (!hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = adminProfileUpdateSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректные данные профиля' }, { status: 400 })
        }
        const { name, email, password } = parsed.data

        // Check if email is taken by another admin
        const existingAdmin = await db.admin.findFirst({
            where: {
                email,
                NOT: {
                    id: user.id
                }
            }
        })

        if (existingAdmin) {
            return NextResponse.json({ error: 'Email уже используется' }, { status: 400 })
        }

        const updateData: Prisma.AdminUpdateInput = {
            name,
            email,
        }

        if (password) {
            updateData.password = await hash(password, 12)
            updateData.hasPassword = true
        }

        const updatedAdmin = await db.admin.update({
            where: { id: user.id },
            data: updateData
        })

        // Log action
        await db.actionLog.create({
            data: {
                adminId: user.id,
                action: 'UPDATE_PROFILE',
                entityType: 'ADMIN',
                entityId: user.id,
                description: `Updated profile for ${updatedAdmin.name}`
            }
        })

        return NextResponse.json({
            message: 'Профиль успешно обновлен',
            user: {
                id: updatedAdmin.id,
                name: updatedAdmin.name,
                email: updatedAdmin.email,
                role: updatedAdmin.role
            }
        })

    } catch (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
