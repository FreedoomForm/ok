import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { db } from '@/lib/db'

function coerceValue(val: string): unknown {
  if (val === '') return undefined
  if (val.toLowerCase() === 'true') return true
  if (val.toLowerCase() === 'false') return false
  if (!isNaN(Number(val)) && val.trim() !== '') return Number(val)
  const d = new Date(val)
  if (!isNaN(d.getTime()) && val.includes('-') && val.length >= 10) return d
  return val
}

export const POST = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request }) => {
    const body = await request.json()
    const { tableId, data } = body

    if (!tableId || !data) throw new BadRequestError('Missing tableId or data')

    const parsedData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'id') continue
      parsedData[key] = coerceValue(String(value))
    }

    let result: unknown
    switch (tableId) {
      case 'admins': result = await db.admin.create({ data: parsedData as any }); break
      case 'customers': result = await db.customer.create({ data: parsedData as any }); break
      case 'orders': result = await db.order.create({ data: parsedData as any }); break
      case 'transactions': result = await db.transaction.create({ data: parsedData as any }); break
      case 'websites': result = await db.website.create({ data: parsedData as any }); break
      case 'menuSets': result = await db.menuSet.create({ data: parsedData as any }); break
      case 'menus': result = await db.menu.create({ data: parsedData as any }); break
      case 'dishes': result = await db.dish.create({ data: parsedData as any }); break
      case 'warehouse': result = await db.warehouseItem.create({ data: parsedData as any }); break
      case 'cookingPlans': result = await db.dailyCookingPlan.create({ data: parsedData as any }); break
      case 'actionLogs': result = await db.actionLog.create({ data: parsedData as any }); break
      case 'orderAudit': result = await db.orderAuditEvent.create({ data: parsedData as any }); break
      default: throw new BadRequestError('Unknown table')
    }

    return { data: { ok: true, result } }
  },
})

export const PUT = createApiRoute({
  requireAuth: ['LOW_ADMIN', 'MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ request }) => {
    const body = await request.json()
    const { tableId, id, data } = body

    if (!tableId || !id || !data) throw new BadRequestError('Missing tableId, id, or data')

    const parsedData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'id') continue
      parsedData[key] = coerceValue(String(value))
    }

    let result: unknown
    switch (tableId) {
      case 'admins': result = await db.admin.update({ where: { id }, data: parsedData as any }); break
      case 'customers': result = await db.customer.update({ where: { id }, data: parsedData as any }); break
      case 'orders': result = await db.order.update({ where: { id }, data: parsedData as any }); break
      case 'transactions': result = await db.transaction.update({ where: { id }, data: parsedData as any }); break
      case 'websites': result = await db.website.update({ where: { id }, data: parsedData as any }); break
      case 'menuSets': result = await db.menuSet.update({ where: { id }, data: parsedData as any }); break
      case 'menus': result = await db.menu.update({ where: { id }, data: parsedData as any }); break
      case 'dishes': result = await db.dish.update({ where: { id }, data: parsedData as any }); break
      case 'warehouse': result = await db.warehouseItem.update({ where: { id }, data: parsedData as any }); break
      case 'cookingPlans': result = await db.dailyCookingPlan.update({ where: { id }, data: parsedData as any }); break
      case 'actionLogs': result = await db.actionLog.update({ where: { id }, data: parsedData as any }); break
      case 'orderAudit': result = await db.orderAuditEvent.update({ where: { id }, data: parsedData as any }); break
      default: throw new BadRequestError('Unknown table')
    }

    return { data: { ok: true, result } }
  },
})
