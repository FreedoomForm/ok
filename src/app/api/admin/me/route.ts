import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { safeJsonParse } from '@/lib/safe-json'

export async function GET(request: NextRequest) {
  try {
    // Use auth() directly — it resolves from cookies/headers in Route Handlers
    const session = await auth()
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await db.admin.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdBy: true,
        allowedTabs: true
      }
    })

    if (!admin) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allowedTabs =
      admin.allowedTabs == null
        ? null
        : (() => {
            const parsedAllowedTabs = safeJsonParse<unknown>(admin.allowedTabs, [])
            return Array.isArray(parsedAllowedTabs)
              ? parsedAllowedTabs.filter((t): t is string => typeof t === 'string')
              : []
          })()

    return NextResponse.json({
      ...admin,
      allowedTabs
    })
  } catch (error) {
    console.error('Error fetching current admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
