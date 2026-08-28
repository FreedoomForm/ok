import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { allocateOrderNumber } from '@/lib/orders/number'
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'
import { ensureFutureContractPeriods } from '@/lib/contracts/renewal-transaction'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { filterOrdersByEffectiveContractPeriods, type EffectiveContractPeriod } from '@/lib/warehouse/effective-demand'

function getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[date.getDay()]
}

function jsonStrings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function generateDeliveryTime(): string {
    const hour = 11 + Math.floor(Math.random() * 3) // 11:00 - 14:00
    const minute = Math.floor(Math.random() * 60)
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export async function GET(req: Request) {
    try {
        // Verify cron secret for security
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) {
            console.error('[SECURITY] CRON_SECRET not configured!')
            return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 })
        }

        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${cronSecret}`) {
            return new Response('Unauthorized', { status: 401 })
        }

        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + 30) // Generate for next 30 days
        const contractPeriodsCreated = await ensureFutureContractPeriods(db, endDate)

        // Get all active customers with auto-orders enabled (excluding deleted ones)
        const customers = await db.customer.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                autoOrdersEnabled: true
            },
            include: {
                contracts: {
                    where: { status: { not: 'DELETED' } },
                    select: {
                        status: true,
                        periods: { select: { startDate: true, endDate: true, status: true, enabledWeekdays: true, disabledDates: true } },
                    },
                },
            },
        })

        let totalOrdersCreated = 0
        const disabledCustomerDates = await getDisabledResourceDates('CLIENT', customers.map((client) => client.id), today, endDate)
        const existingOrders = customers.length === 0 ? [] : await db.order.findMany({
            where: {
                customerId: { in: customers.map((client) => client.id) },
                deliveryDate: { gte: today, lte: endDate },
            },
            select: { customerId: true, deliveryDate: true },
        })
        const existingOrderDatesByCustomer = new Map<string, Set<string>>()
        for (const order of existingOrders) {
            if (!order.deliveryDate) continue
            const dates = existingOrderDatesByCustomer.get(order.customerId) ?? new Set<string>()
            dates.add(toAvailabilityDateKey(order.deliveryDate))
            existingOrderDatesByCustomer.set(order.customerId, dates)
        }

        // Get default admin for order attribution
        const defaultAdmin = await db.admin.findFirst({
            where: { role: 'SUPER_ADMIN' }
        })

        if (!defaultAdmin) {
            return NextResponse.json({ error: 'No default admin found' }, { status: 500 })
        }

        for (const client of customers) {
            // Parse delivery days from database (stored as JSON string)
            const defaultDeliveryDays = {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
            }
            const deliveryDays = safeJsonParse<Record<string, boolean>>(client.deliveryDays, defaultDeliveryDays)

            // Get calories from database
            const calories = client.calories || 2000
            const contractPeriods: EffectiveContractPeriod[] = client.contracts.flatMap((contract) => contract.periods.map((period) => ({
                customerId: client.id,
                startDate: period.startDate.toISOString().slice(0, 10),
                endDate: period.endDate.toISOString().slice(0, 10),
                isActive: contract.status === 'ENABLED' && period.status === 'ENABLED',
                enabledWeekdays: jsonStrings(period.enabledWeekdays),
                disabledDates: jsonStrings(period.disabledDates),
            })))

            // Iterate through each day in the next 30 days
            for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
                const deliveryDate = new Date(d)
                const dayOfWeek = getDayOfWeek(deliveryDate)

                if (disabledCustomerDates.get(client.id)?.has(toAvailabilityDateKey(deliveryDate))) {
                    continue
                }

                // Check if this day is enabled for delivery
                if (!deliveryDays[dayOfWeek]) {
                    continue
                }

                if (contractPeriods.length > 0 && filterOrdersByEffectiveContractPeriods([{
                    customerId: client.id,
                    quantity: 1,
                    calories,
                    deliveryDate: deliveryDate.toISOString(),
                }], contractPeriods).length === 0) {
                    continue
                }

                const deliveryDateStart = new Date(deliveryDate)
                deliveryDateStart.setHours(0, 0, 0, 0)
                const deliveryDateEnd = new Date(deliveryDateStart)
                deliveryDateEnd.setHours(23, 59, 59, 999)
                const dateKey = toAvailabilityDateKey(deliveryDateStart)
                if (!existingOrderDatesByCustomer.get(client.id)?.has(dateKey)) {
                    // Revalidate both parent and order inside the transaction for concurrent cleanup and cron safety.
                    const created = await db.$transaction(async (tx) => {
                        const currentClient = await tx.$queryRaw<Array<{ id: string }>>`
                            SELECT "id" FROM "customers"
                            WHERE "id" = ${client.id}
                              AND "isActive" = true
                              AND "deletedAt" IS NULL
                              AND "autoOrdersEnabled" = true
                            FOR UPDATE
                        `
                        if (currentClient.length === 0) return false
                        const existingOrder = await tx.order.findFirst({
                            where: { customerId: client.id, deliveryDate: { gte: deliveryDateStart, lte: deliveryDateEnd } },
                            select: { id: true },
                        })
                        if (existingOrder) return false
                        const orderNumber = await allocateOrderNumber(tx)
                        await tx.order.create({
                        data: {
                            orderNumber,
                            customerId: client.id,
                            adminId: defaultAdmin.id,
                            deliveryAddress: client.address,
                            latitude: client.latitude ?? null,
                            longitude: client.longitude ?? null,
                            deliveryDate: new Date(d),
                            deliveryTime: generateDeliveryTime(),
                            quantity: 1,
                            calories: calories,
                            specialFeatures: client.preferences,
                            paymentStatus: PaymentStatus.UNPAID,
                            paymentMethod: PaymentMethod.CASH,
                            isPrepaid: false,
                            orderStatus: OrderStatus.NEW,
                            fromAutoOrder: true,
                            courierId: client.defaultCourierId || null
                        }
                        })
                        return true
                    })
                    if (created) {
                        totalOrdersCreated++
                        const dates = existingOrderDatesByCustomer.get(client.id) ?? new Set<string>()
                        dates.add(dateKey)
                        existingOrderDatesByCustomer.set(client.id, dates)
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Scheduler completed. Created ${totalOrdersCreated} orders.`,
            ordersCreated: totalOrdersCreated,
            contractPeriodsCreated,
            clientsProcessed: customers.length,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('Scheduler error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
