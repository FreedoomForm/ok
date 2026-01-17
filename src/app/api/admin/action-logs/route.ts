import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

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

    let where: any = {}

    // Role-based filtering logic
    if (user.role === 'SUPER_ADMIN') {
      // Super Admin can see everything or filter by specific user
      if (targetAdminId && targetAdminId !== 'all') {
        where.adminId = targetAdminId
      }
    } else if (user.role === 'MIDDLE_ADMIN') {
      // Middle Admin can see their own logs and logs of users they created
      const createdUsers = await db.admin.findMany({
        where: { createdBy: user.id },
        select: { id: true }
      })
      const allowedIds = [user.id, ...createdUsers.map(u => u.id)]

      if (targetAdminId && targetAdminId !== 'all') {
        // If requesting specific user, verify access
        if (!allowedIds.includes(targetAdminId)) {
          return NextResponse.json({ error: 'Access denied to this user logs' }, { status: 403 })
        }
        where.adminId = targetAdminId
      } else {
        // If no specific user, show logs for all allowed users
        where.adminId = { in: allowedIds }
      }
    } else {
      // Low Admin and Courier can ONLY see their own logs
      where.adminId = user.id
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