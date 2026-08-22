import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { Prisma } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'
import { parseBoundedPagination } from '@/lib/pagination'
import { buildClientCreateData, clientCreateSchema } from '@/lib/admin/clients'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pagination = parseBoundedPagination(searchParams.get('limit'), searchParams.get('offset'))

    // Build where clause for filtering
    const whereClause: Prisma.CustomerWhereInput = {
      deletedAt: null
    }

    // Data isolation: Different isolation rules for each role
    if (user.role === 'MIDDLE_ADMIN') {
      // Get all low admins created by this middle admin
      const lowAdmins = await db.admin.findMany({
        where: {
          createdBy: user.id,
          role: 'LOW_ADMIN'
        },
        select: { id: true }
      })
      const lowAdminIds = lowAdmins.map(admin => admin.id)

      // Filter clients: only those created by this middle admin or their low admins
      whereClause.createdBy = {
        in: [user.id, ...lowAdminIds]
      }
    } else if (user.role === 'LOW_ADMIN') {
      // LOW_ADMIN sees clients for their owner group
      const groupAdminIds = await getGroupAdminIds(user)
      whereClause.createdBy = { in: groupAdminIds && groupAdminIds.length > 0 ? groupAdminIds : [user.id] }
    }
    // SUPER_ADMIN sees all clients (no additional filter)

    // Get clients from database with isActive status, excluding deleted ones.
    // Pagination is opt-in so existing callers continue receiving the complete array.
    const [dbClients, total] = await Promise.all([
      db.customer.findMany({
        where: whereClause,
        include: {
          defaultCourier: {
            select: {
              id: true,
              name: true
            }
          },
          assignedSet: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        ...(pagination ? { take: pagination.limit, skip: pagination.offset } : {})
      }),
      pagination ? db.customer.count({ where: whereClause }) : Promise.resolve(null)
    ])

    // Return clients with all data from database
    const defaultDeliveryDays = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }

    const clients = dbClients.map(dbClient => ({
      id: dbClient.id,
      name: dbClient.name,
      nickName: dbClient.nickName,
      phone: dbClient.phone,
      address: dbClient.address,
      calories: dbClient.calories || 2000,
      planType: dbClient.planType || 'CLASSIC',
      dailyPrice: dbClient.dailyPrice || 84000,
      balance: typeof dbClient.balance === 'number' ? dbClient.balance : 0,
      notes: dbClient.notes || '',
      specialFeatures: dbClient.preferences || '',
      deliveryDays: (() => {
        const parsed = safeJsonParse<unknown>(dbClient.deliveryDays, defaultDeliveryDays)
        return typeof parsed === 'object' && parsed ? parsed : defaultDeliveryDays
      })(),
      autoOrdersEnabled: dbClient.autoOrdersEnabled,
      isActive: dbClient.isActive,
      createdAt: dbClient.createdAt.toISOString(),
      latitude: dbClient.latitude,
      longitude: dbClient.longitude,
      defaultCourierId: dbClient.defaultCourierId,
      defaultCourierName: dbClient.defaultCourier?.name,
      assignedSetId: dbClient.assignedSetId,
      assignedSetName: dbClient.assignedSet?.name
    }))

    const response = NextResponse.json(clients)
    if (pagination && total !== null) {
      response.headers.set('X-Clients-Total', String(total))
      response.headers.set('X-Clients-Offset', String(pagination.offset))
      response.headers.set('X-Clients-Limit', String(pagination.limit))
      response.headers.set('X-Clients-Has-More', String(pagination.offset + clients.length < total))
    }

    return response

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let phone = ''
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = clientCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Некорректные данные клиента',
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const clientData = parsed.data
    phone = clientData.phone
    const createdBy = user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN' ? user.id : null
    const existingClient = await db.customer.findFirst({
      where: { phone, createdBy, deletedAt: null },
      select: { id: true },
    })
    if (existingClient) {
      return NextResponse.json({
        error: 'Клиент с таким номером телефона уже существует'
      }, { status: 409 })
    }

    const dbClient = await db.customer.create({
      data: buildClientCreateData(clientData, createdBy),
      include: {
        defaultCourier: {
          select: {
            id: true,
            name: true
          }
        },
        assignedSet: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Return created client
    const newClient = {
      id: dbClient.id,
      name: dbClient.name,
      nickName: dbClient.nickName,
      phone: dbClient.phone,
      address: dbClient.address,
      calories: dbClient.calories || 2000,
      planType: dbClient.planType || 'CLASSIC',
      dailyPrice: dbClient.dailyPrice || 84000,
      balance: typeof dbClient.balance === 'number' ? dbClient.balance : 0,
      notes: dbClient.notes || '',
      specialFeatures: dbClient.preferences || '',
      deliveryDays: safeJsonParse<Record<string, boolean>>(dbClient.deliveryDays, {}),
      autoOrdersEnabled: dbClient.autoOrdersEnabled,
      isActive: dbClient.isActive,
      createdAt: dbClient.createdAt.toISOString(),
      latitude: dbClient.latitude,
      longitude: dbClient.longitude,
      defaultCourierId: dbClient.defaultCourierId,
      defaultCourierName: dbClient.defaultCourier?.name,
      assignedSetId: dbClient.assignedSetId,
      assignedSetName: dbClient.assignedSet?.name
    }

    return NextResponse.json({
      message: 'Клиент успешно создан',
      client: newClient
    })

  } catch (error) {
    console.error('Error creating client:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const deletedClient = await db.customer.findFirst({
          where: {
            phone: phone,
            deletedAt: { not: null }
          }
        });

        if (deletedClient) {
          return NextResponse.json({
            error: 'Клиент с таким номером находится в корзине. Восстановите его или удалите навсегда.'
          }, { status: 409 });
        }

        return NextResponse.json({
          error: 'Клиент с таким номером телефона уже существует'
        }, { status: 409 })
      }
      if (error.code === 'P2003') {
        return NextResponse.json({
          error: 'Указан неверный ID курьера или создателя'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
