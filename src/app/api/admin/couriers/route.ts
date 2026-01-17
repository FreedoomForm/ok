import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { passwordSchema, emailSchema } from '@/lib/validations'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const whereClause: any = {
      role: 'COURIER',
      isActive: true
    }

    // Data isolation: MIDDLE_ADMIN can only see couriers they created
    if (user.role === 'MIDDLE_ADMIN') {
      whereClause.createdBy = user.id
    }

    const couriers = await db.admin.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        allowedTabs: true,
        salary: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const transformedCouriers = couriers.map(courier => ({
      ...courier,
      allowedTabs: courier.allowedTabs ? JSON.parse(courier.allowedTabs) : []
    }))

    return NextResponse.json(transformedCouriers)
  } catch (error) {
    console.error('Error fetching couriers:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
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

    const { name, email, password, salary } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
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

    // Validate password
    try {
      passwordSchema.parse(password)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
    }

    // Check if email already exists
    const existingAdmin = await db.admin.findUnique({
      where: { email: email }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Администратор с таким email уже существует' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create courier
    const newCourier = await db.admin.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: 'COURIER',
        isActive: true,
        createdBy: user.id,
        allowedTabs: null,
        salary: salary ? parseInt(salary) : 0
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        allowedTabs: true,
        salary: true
      }
    })

    // Log the action
    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'CREATE_COURIER',
          entityType: 'ADMIN',
          entityId: newCourier.id,
          description: `Created courier account: ${newCourier.name} (${newCourier.email})`
        }
      })
    } catch (logError) {
      console.error('Failed to create action log:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      ...newCourier,
      allowedTabs: newCourier.allowedTabs ? JSON.parse(newCourier.allowedTabs) : []
    })
  } catch (error) {
    console.error('Error creating courier:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Курьер с таким email уже существует' }, { status: 409 })
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