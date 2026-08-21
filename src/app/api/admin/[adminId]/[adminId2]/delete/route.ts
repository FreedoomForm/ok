import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { adminTargetIdSchema, safeAdminSelect } from '@/lib/admin/admin-mutations'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ adminId: string; adminId2: string }> }
) {
  try {
    const { adminId: _parentAdminId, adminId2 } = await context.params
    const targetId = adminTargetIdSchema.safeParse(adminId2)
    if (!targetId.success) {
      return NextResponse.json({ error: 'Неверный идентификатор администратора' }, { status: 400 })
    }
    const user = await getAuthUser(request)

    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Check if admin exists
    const adminToDelete = await db.admin.findUnique({
      where: { id: targetId.data },
      select: safeAdminSelect,
    })

    if (!adminToDelete) {
      return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
    }

    // Prevent deleting yourself
    if (user.id === targetId.data) {
      return NextResponse.json({ error: 'Нельзя удалить самого себя' }, { status: 400 })
    }

    // Delete admin
    await db.admin.delete({
      where: { id: targetId.data }
    })

    // Log action
    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: 'DELETE_ADMIN',
        entityType: 'ADMIN',
        entityId: targetId.data,
        description: `Deleted admin ${adminToDelete.name} (${adminToDelete.email})`
      }
    })

    return NextResponse.json({
      message: 'Администратор успешно удален',
      admin: adminToDelete
    })

  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
