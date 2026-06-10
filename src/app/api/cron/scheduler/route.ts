import { createPublicApiRoute } from '@/modules/shared/http'
import { UnauthorizedError, InternalError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

function generateDeliveryTime(): string {
  const hour = 11 + Math.floor(Math.random() * 3)
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export const GET = createPublicApiRoute(async ({ request }) => {
  // Verify cron secret for security
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new InternalError('CRON_SECRET not configured')
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError('Unauthorized')
  }

  console.log('🤖 Auto Order Scheduler started via Cron')

  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 30)

  const customers = await db.customer.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      autoOrdersEnabled: true,
    },
  })

  let totalOrdersCreated = 0

  const defaultAdmin = await db.admin.findFirst({
    where: { role: 'SUPER_ADMIN' },
  })

  if (!defaultAdmin) {
    throw new InternalError('No default admin found')
  }

  for (const client of customers) {
    const defaultDeliveryDays = {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    }
    const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, defaultDeliveryDays)
    const calories = client.calories || 2000

    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const deliveryDate = new Date(d)
      const dayOfWeek = getDayOfWeek(deliveryDate)

      if (!deliveryDays[dayOfWeek]) continue

      const existingOrder = await db.order.findFirst({
        where: {
          customerId: client.id,
          deliveryDate: {
            gte: new Date(deliveryDate.setHours(0, 0, 0, 0)),
            lt: new Date(deliveryDate.setHours(23, 59, 59, 999)),
          },
        },
      })

      if (!existingOrder) {
        const lastOrder = await db.order.findFirst({ orderBy: { orderNumber: 'desc' } })
        const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

        await db.order.create({
          data: {
            orderNumber: nextOrderNumber,
            customerId: client.id,
            adminId: defaultAdmin.id,
            deliveryAddress: client.address,
            latitude: client.latitude ?? null,
            longitude: client.longitude ?? null,
            deliveryDate: new Date(d),
            deliveryTime: generateDeliveryTime(),
            quantity: 1,
            calories,
            specialFeatures: client.preferences,
            paymentStatus: PaymentStatus.UNPAID,
            paymentMethod: PaymentMethod.CASH,
            isPrepaid: false,
            orderStatus: OrderStatus.NEW,
            fromAutoOrder: true,
            courierId: client.defaultCourierId || null,
          },
        })
        totalOrdersCreated++
      }
    }
  }

  console.log(`✅ Scheduler completed. Created ${totalOrdersCreated} orders.`)

  return {
    data: {
      success: true,
      message: `Scheduler completed. Created ${totalOrdersCreated} orders.`,
      ordersCreated: totalOrdersCreated,
      clientsProcessed: customers.length,
      timestamp: new Date().toISOString(),
    },
  }
})
