import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const customers = await db.customer.findMany({
      where: {
        isActive: true
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