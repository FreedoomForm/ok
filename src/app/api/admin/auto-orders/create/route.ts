import { createApiRoute } from '@/modules/shared/http'
import { db } from '@/lib/db'
import { OrderStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client'

function isEligibleByPattern(orderPattern: string | null | undefined, date: Date) {
  const day = date.getDate()
  switch (orderPattern) {
    case 'every_other_day_even': return day % 2 === 0
    case 'every_other_day_odd': return day % 2 === 1
    case 'daily': default: return true
  }
}

function startOfDay(date: Date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function endOfDay(date: Date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d }
function defaultDeliveryTime(): string { const h = 11 + Math.floor(Math.random() * 3); const m = Math.floor(Math.random() * 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` }

async function getNextOrderNumber(): Promise<number> {
  const lastOrder = await db.order.findFirst({ orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } })
  return lastOrder ? lastOrder.orderNumber + 1 : 1
}

export const POST = createApiRoute<{
  message: string; startDate?: string; createdCount: number; failedCount: number; sampleOrders: unknown[]
}>({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request }) => {
    const { targetDate } = await request.json()
    const startDate = targetDate ? new Date(targetDate) : new Date()
    startDate.setHours(0, 0, 0, 0)

    let defaultAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })
    if (!defaultAdmin) defaultAdmin = await db.admin.findUnique({ where: { id: user.id } })
    if (!defaultAdmin) defaultAdmin = await db.admin.findFirst()
    if (!defaultAdmin) return { data: { message: 'No admin found', createdCount: 0, failedCount: 0, sampleOrders: [] as unknown[] } }

    const customersWhere: Record<string, unknown> = { isActive: true, deletedAt: null, autoOrdersEnabled: true }
    if (user.role === 'MIDDLE_ADMIN') {
      const lowAdmins = await db.admin.findMany({ where: { createdBy: user.id, role: 'LOW_ADMIN' }, select: { id: true } })
      customersWhere.createdBy = { in: [user.id, ...lowAdmins.map((a) => a.id)] }
    }

    const customers = await db.customer.findMany({ where: customersWhere })
    let totalCreated = 0
    let totalFailed = 0
    const createdOrdersSummary: unknown[] = []
    let nextOrderNumber = await getNextOrderNumber()

    for (let i = 0; i < 30; i++) {
      const processDate = new Date(startDate)
      processDate.setDate(startDate.getDate() + i)
      const dayStart = startOfDay(processDate)
      const dayEnd = endOfDay(processDate)
      const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayOfWeek = weekdayKeys[processDate.getDay()]

      for (const c of customers) {
        let deliveryDays: Record<string, boolean> = {
          monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true,
        }
        if ((c as Record<string, unknown>).deliveryDays) {
          try {
            deliveryDays = typeof (c as Record<string, unknown>).deliveryDays === 'string'
              ? JSON.parse((c as Record<string, unknown>).deliveryDays as string)
              : ((c as Record<string, unknown>).deliveryDays as Record<string, boolean>)
          } catch { /* fallback */ }
        }
        if (!deliveryDays[dayOfWeek]) continue

        const existing = await db.order.findFirst({
          where: { customerId: c.id, deliveryDate: { gte: dayStart, lte: dayEnd } },
          select: { id: true, adminId: true },
        })
        if (existing) {
          if (existing.adminId === defaultAdmin.id && c.createdBy && c.createdBy !== defaultAdmin.id) {
            await db.order.update({ where: { id: existing.id }, data: { adminId: c.createdBy } })
          }
          continue
        }

        let createdOrder: Record<string, unknown> | null = null
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            createdOrder = await db.order.create({
              data: {
                orderNumber: nextOrderNumber,
                customerId: c.id,
                adminId: c.createdBy || defaultAdmin.id,
                deliveryAddress: c.address,
                latitude: c.latitude ?? null,
                longitude: c.longitude ?? null,
                deliveryDate: new Date(dayStart),
                deliveryTime: defaultDeliveryTime(),
                quantity: 1,
                calories: c.calories ?? 1600,
                specialFeatures: c.preferences || '',
                paymentStatus: PaymentStatus.UNPAID,
                paymentMethod: PaymentMethod.CASH,
                isPrepaid: false,
                orderStatus: OrderStatus.NEW,
                fromAutoOrder: true,
              },
              include: { customer: { select: { name: true, phone: true } } },
            }) as unknown as Record<string, unknown>
            nextOrderNumber += 1
            break
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              nextOrderNumber = await getNextOrderNumber()
              continue
            }
            throw error
          }
        }

        if (!createdOrder) { totalFailed += 1; continue }
        totalCreated++
        if (createdOrdersSummary.length < 50) {
          const cust = createdOrder.customer as Record<string, unknown> | undefined
          createdOrdersSummary.push({
            id: createdOrder.id,
            customerName: cust?.name,
            date: processDate.toISOString().split('T')[0],
          })
        }
      }
    }

    return {
      data: {
        message: `Automatically created ${totalCreated} orders for 30 days`,
        startDate: startDate.toDateString(),
        createdCount: totalCreated,
        failedCount: totalFailed,
        sampleOrders: createdOrdersSummary,
      },
    }
  },
})

export const GET = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const target = dateParam ? new Date(dateParam) : new Date()
    const dayStart = startOfDay(target)
    const dayEnd = endOfDay(target)

    const todays = await db.order.findMany({
      where: { deliveryDate: { gte: dayStart, lte: dayEnd } },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const tomorrow = new Date(dayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const customers = await db.customer.findMany({
      where: { isActive: true, deletedAt: null, autoOrdersEnabled: true },
      select: { id: true, name: true, phone: true, orderPattern: true },
    })
    const tomorrowEligible = customers.filter((c) => isEligibleByPattern(c.orderPattern, tomorrow))

    return {
      data: {
        todayStats: {
          date: dayStart.toDateString(),
          autoOrdersCreated: todays.length,
          orders: todays.map((o) => ({
            id: o.id, customerName: o.customer?.name, customerPhone: o.customer?.phone,
            deliveryAddress: o.deliveryAddress, deliveryDate: o.deliveryDate?.toISOString().split('T')[0],
            deliveryTime: o.deliveryTime, isAutoOrder: o.fromAutoOrder,
          })),
        },
        tomorrowPreview: { date: tomorrow.toDateString(), eligibleClients: tomorrowEligible.length, clients: tomorrowEligible },
      },
    }
  },
})
