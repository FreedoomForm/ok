import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { allocateOrderNumber } from '@/lib/orders/number'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

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

        const today = new Date()
        const todayDayName = getDayOfWeek(today)
        const groupAdminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

        // Get only active, non-deleted, auto-order clients in the caller's group.
        const customers = await db.customer.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                autoOrdersEnabled: true,
                ...(groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}),
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
                calories: true
            }
        })

        let totalOrdersCreated = 0

        for (const client of customers) {
            // Parse delivery days from orderPattern
            let deliveryDays = {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
            }

            if (client.orderPattern) {
                try {
                    deliveryDays = JSON.parse(client.orderPattern)
                } catch (e) {
                    console.error('Error parsing orderPattern for client', client.id, e)
                }
            }

            // Skip if delivery is not enabled for today
            if (!deliveryDays[todayDayName as keyof typeof deliveryDays]) {
                continue
            }

            // Determine the adminId to use:
            // Use client's creator if available, otherwise use the current user (who triggered the scheduler)
            const adminId = client.createdBy || user.id

            // Check if order already exists for this client and today
            const dayStart = new Date(today)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(today)
            dayEnd.setHours(23, 59, 59, 999)

            const existingOrder = await db.order.findFirst({
                where: {
                    customerId: client.id,
                    deliveryDate: {
                        gte: dayStart,
                        lt: dayEnd
                    }
                }
            })

            if (!existingOrder) {
                // Create order for today only
                await db.$transaction(async (tx) => {
                    const orderNumber = await allocateOrderNumber(tx)
                    await tx.order.create({
                    data: {
                        orderNumber,
                        customerId: client.id,
                        adminId: adminId,
                        deliveryAddress: client.address,
                        latitude: client.latitude ?? null,
                        longitude: client.longitude ?? null,
                        deliveryDate: today,
                        deliveryTime: generateDeliveryTime(),
                        quantity: 1,
                        calories: client.calories || 2000, // Use client's calories or default
                        specialFeatures: client.preferences,
                        paymentStatus: 'UNPAID',
                        paymentMethod: 'CASH',
                        isPrepaid: false,
                        orderStatus: 'NEW',
                        fromAutoOrder: true // Mark as auto-generated
                    }
                    })
                })
                totalOrdersCreated++
            }
        }

        return NextResponse.json({
            success: true,
            ordersCreated: totalOrdersCreated,
            message: `Создано ${totalOrdersCreated} автоматических заказов`
        })

    } catch (error) {
        console.error('Run auto orders error:', error)
        return NextResponse.json({
            error: 'Ошибка при создании автоматических заказов',
            ...(process.env.NODE_ENV === 'development' && {
                details: error instanceof Error ? error.message : 'Неизвестная ошибка'
            })
        }, { status: 500 })
    }
}
