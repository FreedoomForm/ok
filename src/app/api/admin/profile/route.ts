import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { hash } from 'bcryptjs'

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
        }

        const body = await request.json()
        const { name, email, password } = body

        if (!name || !email) {
            return NextResponse.json({ error: 'Имя и Email обязательны' }, { status: 400 })
        }

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

        const updateData: any = {
            name,
            email
        }

        if (password) {
            updateData.password = await hash(password, 12)
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
