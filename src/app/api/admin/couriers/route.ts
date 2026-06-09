import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { passwordSchema, emailSchema } from '@/lib/validations'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { safeJsonParse } from '@/lib/safe-json'

const courierPatchSchema = z
  .object({
    courierId: z.string().min(1),
    name: z.string().trim().min(1).max(120).optional(),
    latitude: z.number().finite().min(-90).max(90).nullable().optional(),
    longitude: z.number().finite().min(-180).max(180).nullable().optional(),
    salary: z.number().int().min(0).optional(),
  })
  .refine(
    (payload) =>
      payload.name !== undefined ||
      payload.latitude !== undefined ||
      payload.longitude !== undefined ||
      payload.salary !== undefined,
    { message: 'No update fields provided' }
  )
  .refine(
    (payload) =>
      (payload.latitude === undefined && payload.longitude === undefined) ||
      (payload.latitude !== undefined && payload.longitude !== undefined),
    { message: 'Provide both latitude and longitude together' }
  )

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const whereClause: any = {
      role: 'COURIER',
      isActive: true
    }

    // Data isolation: non-super admins can only see couriers in their group
    if (user.role !== 'SUPER_ADMIN') {
      const groupAdminIds = await getGroupAdminIds(user)
      if (groupAdminIds) {
        whereClause.createdBy = { in: groupAdminIds }
      } else {
        whereClause.createdBy = user.id
      }
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
        salary: true,
        latitude: true,
        longitude: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const transformedCouriers = couriers.map(courier => ({
      ...courier,
      allowedTabs: (() => {
        const parsed = safeJsonParse<unknown>(courier.allowedTabs, [])
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
      })()
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

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const raw = await request.json().catch(() => null)
    const parsed = courierPatchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      )
    }

    const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
    const whereClause: any = {
      id: parsed.data.courierId,
      role: 'COURIER',
    }

    if (groupAdminIds) {
      whereClause.createdBy = { in: groupAdminIds }
    }

    const existingCourier = await db.admin.findFirst({
      where: whereClause,
      select: { id: true, name: true, email: true, latitude: true, longitude: true },
    })

    if (!existingCourier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim()
    if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
      updateData.latitude = parsed.data.latitude
      updateData.longitude = parsed.data.longitude
    }
    if (parsed.data.salary !== undefined) updateData.salary = parsed.data.salary

    const updatedCourier = await db.admin.update({
      where: { id: existingCourier.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        allowedTabs: true,
        salary: true,
        latitude: true,
        longitude: true,
      },
    })

    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'UPDATE_COURIER',
          entityType: 'ADMIN',
          entityId: updatedCourier.id,
          description: `Updated courier from map: ${updatedCourier.name}`,
        },
      })
    } catch (logError) {
      console.error('Failed to log courier update action:', logError)
    }

    return NextResponse.json({
      ...updatedCourier,
      allowedTabs: (() => {
        const parsedAllowedTabs = safeJsonParse<unknown>(updatedCourier.allowedTabs, [])
        return Array.isArray(parsedAllowedTabs)
          ? parsedAllowedTabs.filter((t): t is string => typeof t === 'string')
          : []
      })(),
    })
  } catch (error) {
    console.error('Error updating courier:', error)
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
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

    const ownerAdminId = (await getOwnerAdminId(user)) ?? user.id
    const createdByAdminId = user.role === 'SUPER_ADMIN' ? user.id : ownerAdminId

    // Create courier
    const newCourier = await db.admin.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: 'COURIER',
        isActive: true,
        createdBy: createdByAdminId,
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
        salary: true,
        latitude: true,
        longitude: true
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
      allowedTabs: (() => {
        const parsed = safeJsonParse<unknown>(newCourier.allowedTabs, [])
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
      })()
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
