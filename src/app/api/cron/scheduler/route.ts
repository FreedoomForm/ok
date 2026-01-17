import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
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

export async function GET(req: Request) {
    try {
        // Verify cron secret for security
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 })
        }

        console.log('🤖 Auto Order Scheduler started via Cron')

        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + 30) // Generate for next 30 days

        // Get all active customers with auto-orders enabled (excluding deleted ones)
        const customers = await db.customer.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                autoOrdersEnabled: true
            }
        })

        let totalOrdersCreated = 0

        // Get default admin for order attribution
        const defaultAdmin = await db.admin.findFirst({
            where: { role: 'SUPER_ADMIN' }
        })

        if (!defaultAdmin) {
            return NextResponse.json({ error: 'No default admin found' }, { status: 500 })
        }

        for (const client of customers) {
            // Parse delivery days from database (stored as JSON string)
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
                    // Create order with client data from database
                    const lastOrder = await db.order.findFirst({
                        orderBy: { orderNumber: 'desc' }
                    })
                    const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1

                    await db.order.create({
                        data: {
                            orderNumber: nextOrderNumber,
                            customerId: client.id,
                            adminId: defaultAdmin.id,
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

        console.log(`✅ Scheduler completed. Created ${totalOrdersCreated} orders.`)

        return NextResponse.json({
            success: true,
            message: `Scheduler completed. Created ${totalOrdersCreated} orders.`,
            ordersCreated: totalOrdersCreated,
            clientsProcessed: customers.length,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('Scheduler error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
