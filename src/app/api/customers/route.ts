import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (!hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const groupAdminIds = await getGroupAdminIds(user)
    const customers = await db.customer.findMany({
      where: {
        isActive: true,
        ...(groupAdminIds ? { createdBy: { in: groupAdminIds } } : {})
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        calories: true,
        deliveryDays: true,
        preferences: true
      }
    })

    return NextResponse.json(customers)

  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    }, { status: 500 })
  }
}