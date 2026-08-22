import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { parseDatabaseRowRequest } from '@/lib/admin/database-row'
import { createDatabaseRow, updateDatabaseRow } from '@/lib/admin/database-row-write'
import { getPublicErrorMessage } from '@/lib/public-error-message'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = parseDatabaseRowRequest(body, { requireId: false })
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { tableId, data: parsedData } = parsed.value
    const result = await createDatabaseRow(db, tableId, parsedData)

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Error inserting row:', error)
    return NextResponse.json(
      { error: getPublicErrorMessage(error, 'Failed to insert row') },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = parseDatabaseRowRequest(body, { requireId: true })
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { tableId, id, data: parsedData } = parsed.value
    if (typeof id !== 'string') return NextResponse.json({ error: 'Missing tableId, id, or data' }, { status: 400 })
    const result = await updateDatabaseRow(db, tableId, id, parsedData)

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Error updating row:', error)
    return NextResponse.json(
      { error: getPublicErrorMessage(error, 'Failed to update row') },
      { status: 500 }
    )
  }
}
