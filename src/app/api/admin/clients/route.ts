import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Build where clause for filtering
    const whereClause: any = {
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
      // LOW_ADMIN can only see clients they created themselves
      whereClause.createdBy = user.id
    }
    // SUPER_ADMIN sees all clients (no additional filter)

    // Get clients from database with isActive status, excluding deleted ones
    const dbClients = await db.customer.findMany({
      where: whereClause,
      include: {
        defaultCourier: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Return clients with all data from database
    const clients = dbClients.map(dbClient => ({
      id: dbClient.id,
      name: dbClient.name,
      nickName: (dbClient as any).nickName,
      phone: dbClient.phone,
      address: dbClient.address,
      calories: dbClient.calories || 2000,
      planType: (dbClient as any).planType || 'CLASSIC',
      dailyPrice: (dbClient as any).dailyPrice || 84000,
      notes: (dbClient as any).notes || '',
      specialFeatures: dbClient.preferences || '',
      deliveryDays: dbClient.deliveryDays ? JSON.parse(dbClient.deliveryDays) : {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      autoOrdersEnabled: dbClient.autoOrdersEnabled,
      isActive: dbClient.isActive,
      createdAt: dbClient.createdAt.toISOString(),
      latitude: dbClient.latitude,
      longitude: dbClient.longitude,
      defaultCourierId: dbClient.defaultCourierId,
      defaultCourierName: (dbClient as any).defaultCourier?.name
    }))

    return NextResponse.json(clients)

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

    const body = await request.json()
    const {
      name,
      nickName,
      phone: inputPhone,
      address,
      calories,
      planType,
      dailyPrice,
      notes,
      specialFeatures,
      deliveryDays,
      autoOrdersEnabled,
      latitude,
      longitude,
      defaultCourierId
    } = body

    // Assign to outer variable for error handling and usage
    if (inputPhone) phone = inputPhone

    // Basic validation
    if (!name || !phone || !address) {
      return NextResponse.json({ error: 'Не все обязательные поля заполнены' }, { status: 400 })
    }

    if (phone.length < 10 || phone.length > 15) {
      return NextResponse.json({ error: 'Неверный формат номера телефона' }, { status: 400 })
    }

    // Save client to database
    const dbClient = await db.customer.create({
      data: {
        name,
        nickName,
        phone,
        address,
        preferences: specialFeatures || '',
        orderPattern: JSON.stringify(deliveryDays || {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }),
        calories: parseInt(calories) || 2000,
        planType: planType || 'CLASSIC',
        dailyPrice: parseInt(dailyPrice) || 84000,
        notes: notes || '',
        deliveryDays: JSON.stringify(deliveryDays || {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        }),
        autoOrdersEnabled: autoOrdersEnabled !== undefined ? autoOrdersEnabled : true,
        isActive: true,
        latitude,
        longitude,
        defaultCourierId: (defaultCourierId === '' || defaultCourierId === 'null') ? null : defaultCourierId,
        createdBy: (user.role === 'MIDDLE_ADMIN' || user.role === 'LOW_ADMIN') ? user.id : null
      } as any,
      include: {
        defaultCourier: {
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
      nickName: (dbClient as any).nickName,
      phone: dbClient.phone,
      address: dbClient.address,
      calories: dbClient.calories || 2000,
      planType: (dbClient as any).planType || 'CLASSIC',
      dailyPrice: (dbClient as any).dailyPrice || 84000,
      notes: (dbClient as any).notes || '',
      specialFeatures: dbClient.preferences || '',
      deliveryDays: dbClient.deliveryDays ? JSON.parse(dbClient.deliveryDays) : {},
      autoOrdersEnabled: dbClient.autoOrdersEnabled,
      isActive: dbClient.isActive,
      createdAt: dbClient.createdAt.toISOString(),
      latitude: dbClient.latitude,
      longitude: dbClient.longitude,
      defaultCourierId: dbClient.defaultCourierId,
      defaultCourierName: (dbClient as any).defaultCourier?.name
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