import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetAdminId = searchParams.get('adminId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateStr = searchParams.get('date')
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    const where: any = {}

    if (dateStr) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)
        
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    } else if (fromStr || toStr) {
      const createdAt: { gte?: Date; lte?: Date } = {}

      if (fromStr) {
        const from = new Date(fromStr)
        if (!isNaN(from.getTime())) {
          const start = new Date(from)
          start.setHours(0, 0, 0, 0)
          createdAt.gte = start
        }
      }

      if (toStr) {
        const to = new Date(toStr)
        if (!isNaN(to.getTime())) {
          const end = new Date(to)
          end.setHours(23, 59, 59, 999)
          createdAt.lte = end
        }
      }

      if (createdAt.gte || createdAt.lte) {
        where.createdAt = createdAt
      }
    }

    // Role-based filtering logic
    if (user.role === 'SUPER_ADMIN') {
      // Super Admin can see everything or filter by specific user
      if (targetAdminId && targetAdminId !== 'all') {
        where.adminId = targetAdminId
      }
    } else {
      const groupAdminIds = await getGroupAdminIds(user)
      const allowedIds = groupAdminIds ?? [user.id]

      if (targetAdminId && targetAdminId !== 'all') {
        if (!allowedIds.includes(targetAdminId)) {
          return NextResponse.json({ error: 'Access denied to this user logs' }, { status: 403 })
        }
        where.adminId = targetAdminId
      } else {
        where.adminId = { in: allowedIds }
      }
    }

    const actionLogs = await db.actionLog.findMany({
      where,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await db.actionLog.count({ where })

    return NextResponse.json({
      logs: actionLogs,
      total,
      hasMore: offset + limit < total
    })
  } catch (error) {
    console.error('Error fetching action logs:', error)
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
      },
      { status: 500 }
    )
  }
}
