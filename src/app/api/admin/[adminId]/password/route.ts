import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ adminId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { adminId } = await context.params

    if (user.id === adminId) {
      return NextResponse.json({ error: 'Cannot reset your own password' }, { status: 400 })
    }

    const targetAdmin = await db.admin.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, createdBy: true, name: true, email: true }
    })

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Middle admin can only reset passwords for admins they created
    if (user.role === 'MIDDLE_ADMIN' && targetAdmin.createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newPassword = randomBytes(9).toString('base64url')
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await db.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword, hasPassword: true }
    })

    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'RESET_ADMIN_PASSWORD',
          entityType: 'ADMIN',
          entityId: adminId,
          description: `Reset password for ${targetAdmin.name} (${targetAdmin.email})`
        }
      })
    } catch {
      // ignore logging failures
    }

    return NextResponse.json({ password: newPassword })
  } catch (error) {
    console.error('Error resetting admin password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

