import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    const { adminId } = params
    const { isActive } = await request.json()

    // Prevent self-modification
    if (user.id === adminId) {
      return NextResponse.json(
        { error: 'Нельзя изменить статус своего аккаунта' },
        { status: 400 }
      )
    }

    // Check if admin exists
    const admin = await db.admin.findUnique({
      where: { id: adminId }
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Администратор не найден' },
        { status: 404 }
      )
    }

    // Middle admins can only manage LOW_ADMIN and COURIER
    if (user.role === 'MIDDLE_ADMIN' && admin.role !== 'LOW_ADMIN' && admin.role !== 'COURIER') {
      return NextResponse.json(
        { error: 'Недостаточно прав для управления этим администратором' },
        { status: 403 }
      )
    }

    // Super admins can only manage MIDDLE_ADMIN (for this route)
    if (user.role === 'SUPER_ADMIN' && admin.role !== 'MIDDLE_ADMIN') {
      return NextResponse.json(
        { error: 'Используйте соответствующий API для этого типа администратора' },
        { status: 400 }
      )
    }

    // Update admin status
    const updatedAdmin = await db.admin.update({
      where: { id: adminId },
      data: { isActive }
    })

    // Log the action
    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: 'TOGGLE_ADMIN_STATUS',
        entityType: 'ADMIN',
        entityId: adminId,
        oldValues: JSON.stringify({ isActive: admin.isActive }),
        newValues: JSON.stringify({ isActive }),
        description: `${isActive ? 'Activated' : 'Deactivated'} admin: ${admin.name}`
      }
    })

    return NextResponse.json(updatedAdmin)
  } catch (error) {
    console.error('Error toggling admin status:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}