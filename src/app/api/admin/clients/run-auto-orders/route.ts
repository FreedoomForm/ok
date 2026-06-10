import { createApiRoute } from '@/modules/shared/http'
import { db } from '@/lib/db'

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

function generateDeliveryTime(): string {
  const hour = 11 + Math.floor(Math.random() * 3)
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export const POST = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user }) => {
    const today = new Date()
    const todayDayName = getDayOfWeek(today)

    const customers = await db.customer.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        autoOrdersEnabled: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        latitude: true,
        longitude: true,
        preferences: true,
        orderPattern: true,
        createdBy: true,
        calories: true,
      },
    })

    let totalOrdersCreated = 0

    for (const client of customers) {
      let deliveryDays: Record<string, boolean> = {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      }

      if (client.orderPattern) {
        try {
          deliveryDays = JSON.parse(client.orderPattern)
        } catch {
          // Keep defaults
        }
      }

      if (!deliveryDays[todayDayName as keyof typeof deliveryDays]) {
        continue
      }

      const adminId = client.createdBy || user.id

      const dayStart = new Date(today)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(today)
      dayEnd.setHours(23, 59, 59, 999)

      const existingOrder = await db.order.findFirst({
        where: {
          customerId: client.id,
          deliveryDate: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      if (!existingOrder) {
        const lastOrder = await db.order.findFirst({
          orderBy: { orderNumber: 'desc' },
        })
        const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

        await db.order.create({
          data: {
            orderNumber: nextOrderNumber,
            customerId: client.id,
            adminId,
            deliveryAddress: client.address,
            latitude: client.latitude ?? null,
            longitude: client.longitude ?? null,
            deliveryDate: today,
            deliveryTime: generateDeliveryTime(),
            quantity: 1,
            calories: client.calories || 2000,
            specialFeatures: client.preferences,
            paymentStatus: 'UNPAID',
            paymentMethod: 'CASH',
            isPrepaid: false,
            orderStatus: 'NEW',
            fromAutoOrder: true,
          },
        })
        totalOrdersCreated++
      }
    }

    return {
      data: {
        success: true,
        ordersCreated: totalOrdersCreated,
        message: `Создано ${totalOrdersCreated} автоматических заказов`,
      },
    }
  },
})
