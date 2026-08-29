import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { adminTargetIdSchema, canDeactivateAdmin } from '@/lib/admin/admin-mutations'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ adminId: string; adminId2: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { adminId: _parentAdminId, adminId2 } = await context.params
    const targetId = adminTargetIdSchema.safeParse(adminId2)
    if (!targetId.success) {
      return NextResponse.json({ error: 'Неверный идентификатор администратора' }, { status: 400 })
    }
    const body = await request.json().catch(() => null)
    const { isActive } = body ?? {}

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
    }

    // Ensure the user is modifying the correct admin (adminId should match user.id if we were checking ownership, 
    // but here it seems adminId is the parent/current admin and adminId2 is the target)
    // However, since we are SUPER_ADMIN, we can modify any admin.

    // Let's verify the target admin exists
    const targetAdmin = await db.admin.findUnique({
      where: { id: targetId.data }
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
    }

    // Prevent deactivating yourself
    if (!canDeactivateAdmin(user.id, targetId.data, isActive)) {
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
        adminId: user.id,
        action: isActive ? 'ACTIVATE_ADMIN' : 'DEACTIVATE_ADMIN',
        entityType: 'ADMIN',
        entityId: targetId.data,
        details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'TOGGLE_ADMIN_STATUS', entity: 'ADMIN' } }),
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
