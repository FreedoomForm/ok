import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import {
  adminStatusMutationSchema,
  adminTargetIdSchema,
  canDeactivateAdmin,
  safeAdminSelect,
} from '@/lib/admin/admin-mutations'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ adminId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    const { adminId } = await context.params
    const parsedAdminId = adminTargetIdSchema.safeParse(adminId)
    if (!parsedAdminId.success) {
      return NextResponse.json({ error: 'Некорректный ID администратора' }, { status: 400 })
    }
    const targetAdminId = parsedAdminId.data

    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON запроса' }, { status: 400 })
    }
    const parsedBody = adminStatusMutationSchema.safeParse(requestBody)
    if (!parsedBody.success) {
      return NextResponse.json({
        error: 'Некорректный статус администратора',
        details: parsedBody.error.flatten(),
      }, { status: 400 })
    }
    const { isActive } = parsedBody.data

    // Prevent self-modification
    if (!canDeactivateAdmin(user.id, targetAdminId, isActive)) {
      return NextResponse.json(
        { error: 'Нельзя изменить статус своего аккаунта' },
        { status: 400 }
      )
    }

    // Check if admin exists
    const admin = await db.admin.findUnique({
      where: { id: targetAdminId }
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

    // Middle admins can only manage admins they created
    if (user.role === 'MIDDLE_ADMIN' && admin.createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      where: { id: targetAdminId },
      data: { isActive },
      select: safeAdminSelect,
    })

    // Log the action
    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: 'TOGGLE_ADMIN_STATUS',
        entityType: 'ADMIN',
        entityId: targetAdminId,
        details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'TOGGLE_ADMIN_STATUS', entity: 'ADMIN' } }),
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
