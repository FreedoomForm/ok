import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

function generateDeliveryTime(): string {
  const hour = 11 + Math.floor(Math.random() * 3) // 11:00 - 14:00
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    console.log('🤖 Auto Order Scheduler started manually by', user.email)

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30) // Generate for next 30 days

    // Get all active customers with auto-orders enabled
    const customers = await db.customer.findMany(({
      where: {
        isActive: true,
        deletedAt: null,
        autoOrdersEnabled: true
      },
      select: {
        id: true,
        address: true,
        preferences: true,
        createdBy: true
      }
    }))

    let totalOrdersCreated = 0

    for (const client of customers) {
      // Parse delivery days from database
      const deliveryDays = (client as any).deliveryDays
        ? JSON.parse((client as any).deliveryDays)
        : {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true
        }

      // Get calories from database
      const calories = (client as any).calories || 2000

      // Iterate through each day in the next 30 days
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const deliveryDate = new Date(d)
        const dayOfWeek = getDayOfWeek(deliveryDate)

        // Check if this day is enabled for delivery
        if (!deliveryDays[dayOfWeek]) {
          continue
        }

        // Check if order already exists for this client and date
        const existingOrder = await db.order.findFirst({
          where: {
            customerId: client.id,
            deliveryDate: {
              gte: new Date(deliveryDate.setHours(0, 0, 0, 0)),
              lt: new Date(deliveryDate.setHours(23, 59, 59, 999))
            }
          }
        })

        if (!existingOrder) {
          // Create order
          const lastOrder = await db.order.findFirst({
            orderBy: { orderNumber: 'desc' }
          })
          const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

          // Use client's creator if available, otherwise use current user
          const adminId = client.createdBy || user.id

          await db.order.create({
            data: {
              orderNumber: nextOrderNumber,
              customerId: client.id,
              adminId: adminId,
              deliveryAddress: client.address,
              deliveryDate: new Date(d),
              deliveryTime: generateDeliveryTime(),
              quantity: 1,
              calories: calories,
              specialFeatures: client.preferences,
              paymentStatus: PaymentStatus.UNPAID,
              paymentMethod: PaymentMethod.CASH,
              isPrepaid: false,
              orderStatus: OrderStatus.PENDING,
              isAutoOrder: true,
              courierId: (client as any).defaultCourierId || null
            }
          })
          totalOrdersCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Планировщик завершен. Создано ${totalOrdersCreated} заказов.`,
      ordersCreated: totalOrdersCreated,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error running scheduler:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Get scheduler status from database
    const customers = await db.customer.findMany({
      where: {
        deletedAt: null
      }
    })

    const activeClients = customers.filter(c => c.isActive && (c as any).autoOrdersEnabled)

    const orders = await db.order.findMany({
      where: {
        deliveryDate: {
          gte: new Date()
        }
      }
    })

    const autoOrders = orders.filter(o => o.isAutoOrder)
    const manualOrders = orders.filter(o => !o.isAutoOrder)

    return NextResponse.json({
      status: 'Планировщик активен (Database)',
      timestamp: new Date().toISOString(),
      stats: {
        totalClients: customers.length,
        activeClients: activeClients.length,
        totalOrders: orders.length,
        autoOrders: autoOrders.length,
        manualOrders: manualOrders.length
      },
      clients: customers.map(client => ({
        id: client.id,
        name: client.name,
        isActive: client.isActive,
        autoOrdersEnabled: (client as any).autoOrdersEnabled || false,
        calories: (client as any).calories || 2000,
        createdAt: client.createdAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}