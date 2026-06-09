import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { z } from 'zod'

const updateMiddleAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().email().optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'At least one field is required',
  })

// PATCH admin
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ adminId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const { adminId } = await context.params
    const body = await request.json().catch(() => null)
    const parsed = updateMiddleAdminSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, email: true, name: true },
    })

    if (!admin || admin.role !== 'MIDDLE_ADMIN') {
      return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
    }

    const nextEmail = parsed.data.email?.trim().toLowerCase()
    const nextName = parsed.data.name?.trim()

    if (nextEmail && nextEmail !== admin.email.toLowerCase()) {
      const existing = await db.admin.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      })
      if (existing && existing.id !== adminId) {
        return NextResponse.json({ error: 'Администратор с таким email уже существует' }, { status: 409 })
      }
    }

    const updated = await db.admin.update({
      where: { id: adminId },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextEmail !== undefined ? { email: nextEmail } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'UPDATE_ADMIN',
          entityType: 'ADMIN',
          entityId: adminId,
          description: `Updated middle admin: ${updated.name}`,
        },
      })
    } catch {
      // non-blocking
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating admin:', error)
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    )
  }
}

// DELETE admin
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ adminId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    const { adminId } = await context.params

    // Check if admin exists and is middle admin
    const admin = await db.admin.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== 'MIDDLE_ADMIN') {
      return NextResponse.json(
        { error: 'Администратор не найден' },
        { status: 404 }
      )
    }

    // Delete admin
    await db.admin.delete({
      where: { id: adminId }
    })

    // Log the action
    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: 'DELETE_ADMIN',
        entityType: 'ADMIN',
        entityId: adminId,
        description: `Deleted middle admin: ${admin.name}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
      },
      { status: 500 }
    )
  }
}
