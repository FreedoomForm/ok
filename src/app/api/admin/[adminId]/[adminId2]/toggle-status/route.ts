import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string; adminId2: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { adminId, adminId2 } = await params
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
    }

    // Ensure the user is modifying the correct admin (adminId should match user.id if we were checking ownership, 
    // but here it seems adminId is the parent/current admin and adminId2 is the target)
    // However, since we are SUPER_ADMIN, we can modify any admin.

    // Let's verify the target admin exists
    const targetAdmin = await db.admin.findUnique({
      where: { id: adminId2 }
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
    }

    // Prevent deactivating yourself
    if (adminId === adminId2 && !isActive) {
      return NextResponse.json({ error: 'Нельзя деактивировать самого себя' }, { status: 400 })
    }

    // Update admin status
    const updatedAdmin = await db.admin.update({
      where: { id: adminId2 },
      data: { isActive }
    })

    // Log action
    await db.actionLog.create({
      data: {
        adminId: adminId,
        action: isActive ? 'ACTIVATE_ADMIN' : 'DEACTIVATE_ADMIN',
        entityType: 'ADMIN',
        entityId: adminId2,
        description: `${isActive ? 'Activated' : 'Deactivated'} admin ${updatedAdmin.name}`
      }
    })

    return NextResponse.json({
      message: `Статус администратора успешно ${isActive ? 'активирован' : 'приостановлен'}`,
      admin: updatedAdmin
    })

  } catch (error) {
    console.error('Error toggling admin status:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}