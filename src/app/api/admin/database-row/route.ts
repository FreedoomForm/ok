import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

// Helper to coerce string values to basic types where possible
function coerceValue(val: string): any {
  if (val === '') return undefined
  if (val.toLowerCase() === 'true') return true
  if (val.toLowerCase() === 'false') return false
  if (!isNaN(Number(val)) && val.trim() !== '') return Number(val)
  // Check if it's a valid date string (simplistic)
  const d = new Date(val)
  if (!isNaN(d.getTime()) && val.includes('-') && val.length >= 10) return d
  return val
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { tableId, data } = body

    if (!tableId || !data) {
      return NextResponse.json({ error: 'Missing tableId or data' }, { status: 400 })
    }

    const parsedData: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue // Don't insert IDs manually in most cases
      parsedData[key] = coerceValue(String(value))
    }

    let result;

    // Prisma generic mapping
    switch (tableId) {
      case 'admins':
        result = await db.admin.create({ data: parsedData as any })
        break
      case 'customers':
        result = await db.customer.create({ data: parsedData as any })
        break
      case 'orders':
        result = await db.order.create({ data: parsedData as any })
        break
      case 'transactions':
        result = await db.transaction.create({ data: parsedData as any })
        break
      case 'websites':
        result = await db.website.create({ data: parsedData as any })
        break
      case 'menuSets':
        result = await db.menuSet.create({ data: parsedData as any })
        break
      case 'menus':
        result = await db.menu.create({ data: parsedData as any })
        break
      case 'dishes':
        result = await db.dish.create({ data: parsedData as any })
        break
      case 'warehouse':
        result = await db.warehouseItem.create({ data: parsedData as any })
        break
      case 'cookingPlans':
        result = await db.dailyCookingPlan.create({ data: parsedData as any })
        break
      case 'actionLogs':
        result = await db.actionLog.create({ data: parsedData as any })
        break
      case 'orderAudit':
        result = await db.orderAuditEvent.create({ data: parsedData as any })
        break
      default:
        return NextResponse.json({ error: 'Unknown table architecture' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Error inserting row:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to insert row' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { tableId, id, data } = body

    if (!tableId || !id || !data) {
      return NextResponse.json({ error: 'Missing tableId, id, or data' }, { status: 400 })
    }

    const parsedData: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue // Don't update IDs
      parsedData[key] = coerceValue(String(value))
    }

    let result;

    // Prisma generic mapping
    switch (tableId) {
      case 'admins':
        result = await db.admin.update({ where: { id }, data: parsedData as any })
        break
      case 'customers':
        result = await db.customer.update({ where: { id }, data: parsedData as any })
        break
      case 'orders':
        result = await db.order.update({ where: { id }, data: parsedData as any })
        break
      case 'transactions':
        result = await db.transaction.update({ where: { id }, data: parsedData as any })
        break
      case 'websites':
        result = await db.website.update({ where: { id }, data: parsedData as any })
        break
      case 'menuSets':
        result = await db.menuSet.update({ where: { id }, data: parsedData as any })
        break
      case 'menus':
        result = await db.menu.update({ where: { id }, data: parsedData as any })
        break
      case 'dishes':
        result = await db.dish.update({ where: { id }, data: parsedData as any })
        break
      case 'warehouse':
        result = await db.warehouseItem.update({ where: { id }, data: parsedData as any })
        break
      case 'cookingPlans':
        result = await db.dailyCookingPlan.update({ where: { id }, data: parsedData as any })
        break
      case 'actionLogs':
        result = await db.actionLog.update({ where: { id }, data: parsedData as any })
        break
      case 'orderAudit':
        result = await db.orderAuditEvent.update({ where: { id }, data: parsedData as any })
        break
      default:
        return NextResponse.json({ error: 'Unknown table architecture' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Error updating row:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update row' },
      { status: 500 }
    )
  }
}
