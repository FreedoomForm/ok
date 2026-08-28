import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { passwordSchema, emailSchema } from '@/lib/validations'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { safeJsonParse } from '@/lib/safe-json'
import { parseBoundedPagination } from '@/lib/pagination'
import { buildCourierLifecycleData, getAffectedFutureCourierOrders } from '@/lib/admin/courier-lifecycle'

const courierCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
  salary: z.coerce.number().int().min(0).max(100_000_000).optional().default(0),
}).strict()

const courierPatchSchema = z
  .object({
    courierId: z.string().min(1),
    name: z.string().trim().min(1).max(120).optional(),
    latitude: z.number().finite().min(-90).max(90).nullable().optional(),
    longitude: z.number().finite().min(-180).max(180).nullable().optional(),
    salary: z.number().int().min(0).optional(),
    deletedAt: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (payload) =>
      payload.name !== undefined ||
      payload.latitude !== undefined ||
      payload.longitude !== undefined ||
      payload.salary !== undefined ||
      payload.deletedAt !== undefined ||
      payload.isActive !== undefined,
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().slice(0, 120) ?? ''
    const showDeleted = searchParams.get('showDeleted') === 'true'
    const pagination = parseBoundedPagination(searchParams.get('limit'), searchParams.get('offset'))

    const whereClause: Prisma.AdminWhereInput = {
      role: 'COURIER',
      ...(showDeleted ? { deletedAt: { not: null } } : { isActive: true, deletedAt: null }),
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
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

    const [couriers, total] = await Promise.all([
      db.admin.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          deletedAt: true,
          createdAt: true,
          allowedTabs: true,
          salary: true,
          latitude: true,
          longitude: true
        },
        orderBy: { createdAt: 'desc' },
        ...(pagination ? { take: pagination.limit, skip: pagination.offset } : {})
      }),
      pagination ? db.admin.count({ where: whereClause }) : Promise.resolve(null)
    ])

    const transformedCouriers = couriers.map(courier => ({
      ...courier,
      allowedTabs: (() => {
        const parsed = safeJsonParse<unknown>(courier.allowedTabs, [])
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
      })()
    }))

    const response = NextResponse.json(transformedCouriers)
    if (pagination && total !== null) {
      response.headers.set('X-Couriers-Total', String(total))
      response.headers.set('X-Couriers-Offset', String(pagination.offset))
      response.headers.set('X-Couriers-Limit', String(pagination.limit))
      response.headers.set('X-Couriers-Has-More', String(pagination.offset + transformedCouriers.length < total))
    }

    return response
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
    const whereClause: Prisma.AdminWhereInput = {
      id: parsed.data.courierId,
      role: 'COURIER',
    }

    if (groupAdminIds) {
      whereClause.createdBy = { in: groupAdminIds }
    }

    const existingCourier = await db.admin.findFirst({
      where: whereClause,
      select: { id: true, name: true, email: true, latitude: true, longitude: true, isActive: true, deletedAt: true },
    })

    if (!existingCourier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
    }

    const disableRequested = parsed.data.deletedAt === true || parsed.data.isActive === false
    if (disableRequested && existingCourier.isActive && existingCourier.deletedAt === null) {
      const workloadRows = await db.order.findMany({
        where: { courierId: existingCourier.id, deletedAt: null, deliveryDate: { not: null, gte: new Date() }, orderStatus: { notIn: ['DELIVERED', 'CANCELED'] } },
        select: { id: true, orderNumber: true, deliveryDate: true, orderStatus: true },
        orderBy: { deliveryDate: 'asc' },
        take: 500,
      })
      const affectedOrders = getAffectedFutureCourierOrders(workloadRows, new Date())
      if (affectedOrders.length > 0) {
        return NextResponse.json({ error: 'REASSIGN_REQUIRED', affectedOrders }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim()
    if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
      updateData.latitude = parsed.data.latitude
      updateData.longitude = parsed.data.longitude
    }
    if (parsed.data.salary !== undefined) updateData.salary = parsed.data.salary
    if (parsed.data.deletedAt !== undefined) {
      updateData.deletedAt = parsed.data.deletedAt ? new Date() : null
      updateData.isActive = !parsed.data.deletedAt
    } else if (parsed.data.isActive !== undefined) {
      Object.assign(updateData, buildCourierLifecycleData({ isActive: parsed.data.isActive }))
    }

    const updatedCourier = await db.admin.update({
      where: { id: existingCourier.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
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

    const parsed = courierCreateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректные данные курьера' }, { status: 400 })
    }
    const { name, email, password, salary } = parsed.data

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
        salary
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
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
