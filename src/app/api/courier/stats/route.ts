import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { isValidResourceDate } from '@/lib/admin/resource-details'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['COURIER'])) {
            return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selectedDateISO = new URL(request.url).searchParams.get('date')
        if (selectedDateISO && !isValidResourceDate(selectedDateISO)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

        if (selectedDateISO) {
            const from = new Date(`${selectedDateISO}T00:00:00.000Z`)
            const to = new Date(`${selectedDateISO}T23:59:59.999Z`)
            const rows = await db.order.findMany({
                where: { courierId: user.id, orderStatus: 'DELIVERED', deliveryDate: { gte: from, lte: to }, deletedAt: null },
                select: { customerId: true, deliveryDate: true },
            })
            const [disabledDates, disabledCourierDates] = await Promise.all([
                getDisabledResourceDates('CLIENT', [...new Set(rows.map((row) => row.customerId))], from, to),
                getDisabledResourceDates('COURIER', [user.id], from, to),
            ])
            const courierDisabled = disabledCourierDates.get(user.id)
            const effectiveRows = rows.filter((row) => {
                if (!row.deliveryDate) return true
                const dateKey = toAvailabilityDateKey(row.deliveryDate)
                return !disabledDates.get(row.customerId)?.has(dateKey) && !courierDisabled?.has(dateKey)
            })
            return NextResponse.json({ totalDelivered: effectiveRows.length, todayDelivered: effectiveRows.length })
        }

        const totalDelivered = await db.order.count({
            where: {
                courierId: user.id,
                orderStatus: 'DELIVERED'
            }
        })

        const todayDelivered = await db.order.count({
            where: {
                courierId: user.id,
                orderStatus: 'DELIVERED',
                deliveredAt: {
                    gte: today
                }
            }
        })

        return NextResponse.json({
            totalDelivered,
            todayDelivered
        })

    } catch (error) {
        console.error('Error fetching courier stats:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
