import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

// §13: the courier portal is a role subset of the flat shell — "courier sees
// assigned routes/orders/contracts". This endpoint serves the contract periods
// assigned to the authenticated courier with a safe projection: no client
// phone, no owner administrator data, bounded to 100 newest periods.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const periods = await db.contractPeriod.findMany({
      where: { courierId: user.id },
      orderBy: [{ startDate: 'desc' }, { endDate: 'desc' }],
      take: 100,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        color: true,
        status: true,
        paid: true,
        enabledWeekdays: true,
        contract: {
          select: {
            status: true,
            customer: {
              select: { name: true, address: true },
            },
          },
        },
      },
    })

    return NextResponse.json(periods.map((period) => ({
      id: period.id,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      color: period.color,
      status: period.status,
      paid: period.paid,
      enabledWeekdays: Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays : [],
      contractStatus: period.contract.status,
      clientName: period.contract.customer?.name ?? '',
      clientAddress: period.contract.customer?.address ?? '',
    })))
  } catch (error) {
    console.error('Error fetching courier contracts:', error)
    return NextResponse.json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' }),
    }, { status: 500 })
  }
}
