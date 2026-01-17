import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { passwordSchema, emailSchema } from '@/lib/validations'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Get middle admins from DB
    const middleAdmins = await db.admin.findMany({
      where: {
        role: 'MIDDLE_ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedAdmins = middleAdmins.map(admin => ({
      ...admin,
      allowedTabs: null
    }))

    return NextResponse.json(transformedAdmins)
  } catch (error) {
    console.error('Error fetching middle admins:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 })
    }

    // Validate email
    try {
      emailSchema.parse(email)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
    }

    // Validate password strength
    try {
      passwordSchema.parse(password)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
    }

    // Check if admin already exists
    const existingAdmin = await db.admin.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      return NextResponse.json({ error: 'Администратор с таким email уже существует' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create new middle admin
    const newAdmin = await db.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'MIDDLE_ADMIN',
        isActive: true,
        createdBy: user.id
      }
    })

    // Log action
    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'CREATE_ADMIN',
          entityType: 'ADMIN',
          entityId: newAdmin.id,
          description: `Created middle admin ${newAdmin.name} (${newAdmin.email})`
        }
      })
    } catch (logError) {
      console.error('Failed to create action log:', logError)
    }

    return NextResponse.json({
      id: newAdmin.id,
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      isActive: newAdmin.isActive,
      createdAt: newAdmin.createdAt,
      allowedTabs: null
    })
  } catch (error: any) {
    console.error('Error creating middle admin:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({
          error: 'Администратор с таким email уже существует'
        }, { status: 409 })
      }
      if (error.code === 'P2003') {
        return NextResponse.json({
          error: 'Ошибка создания: неверный ID создателя'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error.message || 'Unknown error'
    }, { status: 500 })
  }
}