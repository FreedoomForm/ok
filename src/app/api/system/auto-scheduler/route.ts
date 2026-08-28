import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { allocateOrderNumber } from '@/lib/orders/number'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { ensureContractRenewedForDate } from '@/lib/contracts/renewal'
import { safeJsonParse } from '@/lib/safe-json'
import { isAutoOrderEligibleOn } from '@/lib/scheduling/auto-order-eligibility'

function startOfDay(date: Date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function endOfDay(date: Date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d }
function defaultDeliveryTime(): string { const h = 11 + Math.floor(Math.random() * 3); const m = Math.floor(Math.random() * 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` }

type SchedulerCreatedOrder = {
  id: string
  customerName: string | undefined
  customerPhone: string | undefined
  deliveryAddress: string
  deliveryDate: string | undefined
  deliveryTime: string | null
  calories: number
  paymentStatus: string
  orderStatus: string
  isAutoOrder: true
  createdAt: Date
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    // Check for cron token or admin request
    const cronToken = request.headers.get('X-Cron-Token')
    const isCronRequest = cronToken === process.env.CRON_SECRET_TOKEN

    if (!isCronRequest) {
      if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN'])) {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const processDate = dateParam ? new Date(dateParam) : new Date()

    // If it's a cron request, we might want to process for tomorrow if it's late in the day
    // But for now let's stick to the requested date or today

    const dayStart = startOfDay(processDate)
    const dayEnd = endOfDay(processDate)

    const renewalCandidates = await db.contract.findMany({
      where: { status: 'ENABLED', autoRenew: true },
      select: { id: true },
    })
    for (const contract of renewalCandidates) await ensureContractRenewedForDate(contract.id, dayStart)

    const customers = await db.customer.findMany({
      where: { isActive: true, autoOrdersEnabled: true },
      include: {
        contracts: {
          where: { status: 'ENABLED' },
          include: { periods: { where: { status: 'ENABLED' } } },
        },
      },
    })
    const defaultAdmin = await db.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })

    // If no super admin, try to find any admin or use a system ID if possible (but schema likely requires valid adminId)
    // For now, fail if no admin found
    if (!defaultAdmin) {
      console.error('No SUPER_ADMIN found for auto-scheduler')
      return NextResponse.json({ error: 'System configuration error' }, { status: 500 })
    }

    const processDateIso = processDate.toISOString().slice(0, 10)
    const availabilityDate = new Date(`${processDateIso}T00:00:00.000Z`)
    const disabledRows = await db.resourceAvailability.findMany({
      where: {
        date: availabilityDate,
        state: 'DISABLED',
        OR: [
          { resourceType: 'CLIENT', resourceId: { in: customers.map((customer) => customer.id) } },
          { resourceType: 'CONTRACT', resourceId: { in: customers.flatMap((customer) => customer.contracts.map((contract) => contract.id)) } },
        ],
      },
      select: { resourceType: true, resourceId: true },
    })
    const disabledClients = new Set(disabledRows.filter((row) => row.resourceType === 'CLIENT').map((row) => row.resourceId))
    const disabledContracts = new Set(disabledRows.filter((row) => row.resourceType === 'CONTRACT').map((row) => row.resourceId))
    const eligible = customers.filter((customer) => {
      if (disabledClients.has(customer.id)) return false
      const contracts = customer.contracts.filter((contract) => !disabledContracts.has(contract.id)).map((contract) => ({
        status: contract.status,
        periods: contract.periods.map((period) => ({
          id: period.id,
          status: period.status,
          startDate: period.startDate.toISOString().slice(0, 10),
          endDate: period.endDate.toISOString().slice(0, 10),
          enabledWeekdays: Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays.filter((value): value is never => typeof value === 'string') as never[] : [],
          disabledDates: Array.isArray(period.disabledDates) ? period.disabledDates.filter((value): value is string => typeof value === 'string') : [],
        })),
      }))
      const deliveryDays = safeJsonParse<Record<string, boolean>>(customer.deliveryDays, {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      })
      return isAutoOrderEligibleOn({
        autoOrdersEnabled: customer.autoOrdersEnabled,
        orderPattern: customer.orderPattern,
        deliveryDays,
        disabledDates: disabledClients.has(customer.id) ? [processDateIso] : [],
        contracts,
      }, processDateIso)
    })

    let created = 0
    const createdOrders: SchedulerCreatedOrder[] = []

    for (const c of eligible) {
      // Check if order already exists for this date
      const existing = await db.order.findFirst({
        where: { customerId: c.id, deliveryDate: { gte: dayStart, lte: dayEnd } },
        select: { id: true }
      })
      if (existing) continue

      const createdOrder = await db.$transaction(async (tx) => {
        const currentCustomer = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "customers"
          WHERE "id" = ${c.id}
            AND "isActive" = true
            AND "deletedAt" IS NULL
            AND "autoOrdersEnabled" = true
          FOR UPDATE
        `
        if (currentCustomer.length === 0) return null
        const existingOrder = await tx.order.findFirst({
          where: { customerId: c.id, deliveryDate: { gte: dayStart, lte: dayEnd } },
          select: { id: true },
        })
        if (existingOrder) return null
        const orderNumber = await allocateOrderNumber(tx)
        return tx.order.create({
        data: {
          orderNumber,
          customerId: c.id,
          adminId: defaultAdmin.id,
          deliveryAddress: c.address,
          deliveryDate: new Date(dayStart),
          deliveryTime: defaultDeliveryTime(),
          quantity: 1,
          calories: c.calories ?? 1600,
          specialFeatures: c.preferences || '',
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
          isPrepaid: false,
          orderStatus: 'NEW',
        },
        include: { customer: { select: { name: true, phone: true } } }
        })
      })

      if (!createdOrder) continue
      created++
      createdOrders.push({
        id: createdOrder.id,
        customerName: createdOrder.customer?.name,
        customerPhone: createdOrder.customer?.phone,
        deliveryAddress: createdOrder.deliveryAddress,
        deliveryDate: createdOrder.deliveryDate?.toISOString().split('T')[0],
        deliveryTime: createdOrder.deliveryTime,
        calories: createdOrder.calories,
        paymentStatus: createdOrder.paymentStatus,
        orderStatus: createdOrder.orderStatus,
        isAutoOrder: true,
        createdAt: createdOrder.createdAt
      })
    }

    return NextResponse.json({
      message: `Автоматически создано ${created} заказов`,
      processedDate: processDate.toDateString(),
      eligibleClients: eligible.length,
      createdOrders: createdOrders.length,
      orders: createdOrders,
      isCronRequest
    })

  } catch (error: unknown) {
    console.error('Error in auto-scheduler:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
