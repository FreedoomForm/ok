import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { safeJsonParse } from '@/lib/safe-json'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json(
        { error: 'Доступ запрещен' }, { status: 403 }
      )
    }

    // Build where clause for filtering
    const whereClause: any = {}

    if (user.role !== 'SUPER_ADMIN') {
      const groupAdminIds = await getGroupAdminIds(user)
      if (groupAdminIds) {
        whereClause.adminId = { in: groupAdminIds }
      } else {
        whereClause.adminId = user.id
      }
    }

    // Get all orders
    const allOrders = await db.order.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            deliveryDays: true
          }
        }
      }
    })

    // Helper function to check if customer has daily delivery
    const isDailyCustomer = (deliveryDays: string | null): boolean => {
      if (!deliveryDays) return false
      const days = safeJsonParse<Record<string, boolean>>(deliveryDays, {})
      return !!(
        days.monday &&
        days.tuesday &&
        days.wednesday &&
        days.thursday &&
        days.friday &&
        days.saturday &&
        days.sunday
      )
    }

    // Helper function to check if customer has even-day delivery
    const isEvenDayCustomer = (deliveryDays: string | null): boolean => {
      if (!deliveryDays) return false
      const days = safeJsonParse<Record<string, boolean>>(deliveryDays, {})
      const selectedDays = Object.values(days).filter(Boolean).length
      return selectedDays >= 3 && selectedDays <= 4 && !isDailyCustomer(deliveryDays)
    }

    // Helper function to check if customer has odd-day delivery
    const isOddDayCustomer = (deliveryDays: string | null): boolean => {
      if (!deliveryDays) return false
      const days = safeJsonParse<Record<string, boolean>>(deliveryDays, {})
      const selectedDays = Object.values(days).filter(Boolean).length
      return selectedDays >= 3 && selectedDays <= 4 && !isDailyCustomer(deliveryDays) && !isEvenDayCustomer(deliveryDays)
    }

    // Calculate statistics
    const stats = {
      successfulOrders: allOrders.filter(o => o.orderStatus === 'DELIVERED').length,
      failedOrders: allOrders.filter(o => o.orderStatus === 'FAILED').length,
      pendingOrders: allOrders.filter(o => o.orderStatus === 'PENDING').length,
      inDeliveryOrders: allOrders.filter(o => o.orderStatus === 'IN_DELIVERY').length,
      pausedOrders: allOrders.filter(o => o.orderStatus === 'PAUSED').length,
      prepaidOrders: allOrders.filter(o => o.isPrepaid).length,
      unpaidOrders: allOrders.filter(o => !o.isPrepaid).length,
      cardOrders: allOrders.filter(o => o.paymentMethod === 'CARD').length,
      cashOrders: allOrders.filter(o => o.paymentMethod === 'CASH').length,
      dailyCustomers: allOrders.filter(o => o.customer && isDailyCustomer(o.customer.deliveryDays)).length,
      evenDayCustomers: allOrders.filter(o => o.customer && isEvenDayCustomer(o.customer.deliveryDays)).length,
      oddDayCustomers: allOrders.filter(o => o.customer && isOddDayCustomer(o.customer.deliveryDays)).length,
      specialPreferenceCustomers: allOrders.filter(o => o.specialFeatures && o.specialFeatures !== '{}' && o.specialFeatures !== '').length,
      orders1200: allOrders.filter(o => o.calories === 1200).length,
      orders1600: allOrders.filter(o => o.calories === 1600).length,
      orders2000: allOrders.filter(o => o.calories === 2000).length,
      orders2500: allOrders.filter(o => o.calories === 2500).length,
      orders3000: allOrders.filter(o => o.calories === 3000).length,
      singleItemOrders: allOrders.filter(o => o.quantity === 1).length,
      multiItemOrders: allOrders.filter(o => o.quantity >= 2).length
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
      },
      { status: 500 }
    )
  }
}
