import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { passwordSchema, emailSchema } from '@/lib/validations'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { safeJsonParse } from '@/lib/safe-json'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    // For middle admin, only get admins created by them
    // For super admin, get all low admins and couriers
    const where: any = {
      role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] as const }
    }

    if (user.role === 'MIDDLE_ADMIN') {
      where.createdBy = user.id
    } else if (user.role === 'LOW_ADMIN') {
      where.createdBy = (await getOwnerAdminId(user)) ?? user.id
    }

    const lowAdmins = await db.admin.findMany({
      where,
      include: {
        creator: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const transformedLowAdmins = lowAdmins.map(admin => ({
      ...admin,
      allowedTabs: (() => {
        const parsed = safeJsonParse<unknown>(admin.allowedTabs, [])
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
      })()
    }))

    return NextResponse.json(transformedLowAdmins)
  } catch (error) {
    console.error('Error fetching low admins:', error)
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    const { email, password, name, role, allowedTabs, salary } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, имя и роль обязательны' },
        { status: 400 }
      )
    }

    // Password is required for non-WORKER roles
    if (role !== 'WORKER' && !password) {
      return NextResponse.json(
        { error: 'Пароль обязателен для администраторов и курьеров' },
        { status: 400 }
      )
    }

    if (!['LOW_ADMIN', 'COURIER', 'WORKER'].includes(role)) {
      return NextResponse.json(
        { error: 'Неверная роль' },
        { status: 400 }
      )
    }

    // Validate allowedTabs if provided
    if (allowedTabs && !Array.isArray(allowedTabs)) {
      return NextResponse.json(
        { error: 'allowedTabs должен быть массивом' },
        { status: 400 }
      )
    }

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
    if (allowedTabs && allowedTabs.some((tab: string) => !validTabs.includes(tab))) {
      return NextResponse.json(
        { error: 'Недопустимое значение в allowedTabs' },
        { status: 400 }
      )
    }

    // Validate email
    try {
      emailSchema.parse(email)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
    }

    // Validate password strength if provided
    if (password) {
      try {
        passwordSchema.parse(password)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
      }
    }

    // Check if admin already exists
    const existingAdmin = await db.admin.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Администратор с таким email уже существует' },
        { status: 400 }
      )
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    // Create low admin or courier or worker
    const newAdmin = await db.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        isActive: true,
        createdBy: user.id,
        allowedTabs: allowedTabs && allowedTabs.length > 0 ? JSON.stringify(allowedTabs) : null,
        salary: salary ? parseInt(salary) : 0,
        hasPassword: !!password
      }
    })

    // Log the action
    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'CREATE_ADMIN',
          entityType: 'ADMIN',
          entityId: newAdmin.id,
          description: `Created ${role.toLowerCase()}: ${name}`
        }
      })
    } catch (logError) {
      console.error('Failed to create action log:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      id: newAdmin.id,
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      isActive: newAdmin.isActive,
      createdAt: newAdmin.createdAt,
      allowedTabs: (() => {
        const parsed = safeJsonParse<unknown>(newAdmin.allowedTabs, [])
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
      })()
    })
  } catch (error) {
    console.error('Error creating low admin:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({
          error: 'Администратор с таким email уже существует'
        }, { status: 409 })
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Ошибка создания: неверный ID создателя' }, { status: 400 })
      }
    }

    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
