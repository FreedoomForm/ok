import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { normalizeIsoDate } from '@/lib/resources/availability'
import { buildResourceDateAuditDetails } from '@/lib/resources/availability-audit'
import { canManageGlobalOperationalResource, isGlobalOperationalResource } from '@/lib/resources/global-policy'

const resourceKinds = [
  'INGREDIENT', 'SET', 'GROUP', 'CLIENT', 'COURIER', 'ADMIN', 'CONTRACT',
  'TRANSACTION', 'VIRTUAL_CARD', 'DISH', 'ORDER', 'PURCHASE', 'CHAT_CONTACT', 'CHAT_MESSAGE', 'CONTRACT_PERIOD', 'COOKING_RECORD', 'ROUTE', 'ROUTE_STOP',
] as const
const querySchema = z.object({
  resourceType: z.enum(resourceKinds),
  resourceId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
})
const writeSchema = querySchema.extend({
  date: z.string(),
  state: z.enum(['ENABLED', 'DISABLED']),
  reason: z.string().trim().max(300).optional(),
  correlationKey: z.string().trim().min(8).max(120).optional(),
})
const bulkWriteSchema = z.object({
  resourceType: z.enum(resourceKinds),
  resourceIds: z.array(z.string().min(1)).min(1).max(100),
  date: z.string(),
  state: z.enum(['ENABLED', 'DISABLED']),
  reason: z.string().trim().max(300).optional(),
  correlationKey: z.string().trim().min(8).max(120).optional(),
})

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
  const groupAdminIds = await getGroupAdminIds(user)
  return { user, ownerAdminId, groupAdminIds }
}

function parseGroupResourceId(resourceId: string): { setId: string; groupId: string } | null {
  const separator = resourceId.indexOf(':')
  if (separator <= 0 || separator === resourceId.length - 1) return null
  return { setId: resourceId.slice(0, separator), groupId: resourceId.slice(separator + 1) }
}

async function ownedGroupExists(resourceId: string, adminIds: readonly string[]): Promise<boolean> {
  const parsed = parseGroupResourceId(resourceId)
  if (!parsed) return false
  const set = await db.menuSet.findFirst({
    where: { id: parsed.setId, OR: [{ adminId: { in: [...adminIds] } }, { adminId: null }] },
    select: { calorieGroups: true },
  })
  if (!set || typeof set.calorieGroups !== 'object' || set.calorieGroups === null || Array.isArray(set.calorieGroups)) return false
  return Object.values(set.calorieGroups).some((day) => Array.isArray(day) && day.some((group) => typeof group === 'object' && group !== null && !Array.isArray(group) && String((group as { id?: unknown }).id ?? '') === parsed.groupId))
}

async function canManage(scope: NonNullable<Awaited<ReturnType<typeof getScope>>>, resourceType: string, resourceId: string) {
  if (!scope) return false
  if (isGlobalOperationalResource(resourceType)) return canManageGlobalOperationalResource(scope.user.role) && await globalResourceExists(resourceType, resourceId)
  if (scope.user.role === 'SUPER_ADMIN') return true
  const ids = scope.groupAdminIds ?? [scope.ownerAdminId]
  switch (resourceType) {
    case 'ADMIN':
    case 'COURIER': {
      const admin = await db.admin.findFirst({ where: { id: resourceId, AND: [{ id: { in: ids } }] }, select: { id: true } })
      return Boolean(admin)
    }
    case 'CLIENT': {
      const client = await db.customer.findFirst({ where: { id: resourceId, createdBy: { in: ids } }, select: { id: true } })
      return Boolean(client)
    }
    case 'SET': {
      const set = await db.menuSet.findFirst({ where: { id: resourceId, OR: [{ adminId: { in: ids } }, { adminId: null }] }, select: { id: true } })
      return Boolean(set)
    }
    case 'GROUP':
      return ownedGroupExists(resourceId, ids)
    case 'INGREDIENT':
      return Boolean(await db.warehouseItem.findUnique({ where: { id: resourceId }, select: { id: true } }).catch(() => null))
    case 'DISH':
      return Boolean(await db.dish.findUnique({ where: { id: resourceId }, select: { id: true } }).catch(() => null))
    case 'VIRTUAL_CARD':
      return Boolean(await db.virtualCard.findFirst({ where: { id: resourceId, ownerAdminId: { in: ids } }, select: { id: true } }))
    case 'PURCHASE':
      return Boolean(await db.purchase.findFirst({ where: { id: resourceId, ownerAdminId: { in: ids } }, select: { id: true } }))
    case 'CONTRACT':
      return Boolean(await db.contract.findFirst({ where: { id: resourceId, ownerAdminId: { in: ids } }, select: { id: true } }))
    case 'CONTRACT_PERIOD':
      return Boolean(await db.contractPeriod.findFirst({ where: { id: resourceId, contract: { ownerAdminId: { in: ids } } }, select: { id: true } }))
    case 'COOKING_RECORD':
      return Boolean(await db.dailyCookingPlan.findUnique({ where: { id: resourceId }, select: { id: true } }).catch(() => null))
    case 'ORDER':
      return Boolean(await db.order.findFirst({ where: { id: resourceId, OR: [{ adminId: { in: ids } }, { customer: { createdBy: { in: ids } } }] }, select: { id: true } }))
    case 'TRANSACTION':
      return Boolean(await db.transaction.findFirst({ where: { id: resourceId, OR: [{ adminId: { in: ids } }, { customer: { createdBy: { in: ids } } }] }, select: { id: true } }))
    case 'CHAT_CONTACT':
      return Boolean(await db.chatContact.findFirst({ where: { id: resourceId, ownerAdminId: { in: ids } }, select: { id: true } }))
    case 'CHAT_MESSAGE':
      return Boolean(await db.message.findFirst({ where: { id: resourceId, conversation: { OR: [{ participant1Id: { in: ids } }, { participant2Id: { in: ids } }] } }, select: { id: true } }))
    case 'ROUTE':
      return Boolean(await db.deliveryRoute.findFirst({ where: { id: resourceId, OR: [{ ownerId: { in: ids } }, { courierId: { in: ids } }] }, select: { id: true } }))
    case 'ROUTE_STOP':
      return Boolean(await db.deliveryRouteStop.findFirst({ where: { id: resourceId, route: { OR: [{ ownerId: { in: ids } }, { courierId: { in: ids } }] } }, select: { id: true } }))
    default:
      return false
  }
}

async function globalResourceExists(resourceType: string, resourceId: string): Promise<boolean> {
  if (resourceType === 'INGREDIENT') return Boolean(await db.warehouseItem.findUnique({ where: { id: resourceId }, select: { id: true } }).catch(() => null))
  if (resourceType === 'DISH') return Boolean(await db.dish.findUnique({ where: { id: resourceId }, select: { id: true } }).catch(() => null))
  if (resourceType === 'COOKING_RECORD') return Boolean(await db.dailyCookingPlan.findUnique({ where: { id: resourceId }, select: { id: true } }).catch(() => null))
  return false
}

function dateFilter(from?: string, to?: string) {
  const start = normalizeIsoDate(from ?? new Date().toISOString())
  const end = normalizeIsoDate(to ?? start)
  return { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T23:59:59.999Z`) }
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const searchParams = new URL(request.url).searchParams
    const batchIds = [...new Set((searchParams.get('resourceIds') ?? '').split(',').map((id) => id.trim()).filter(Boolean))]
    if (batchIds.length > 0) {
      const parsedType = z.enum(resourceKinds).safeParse(searchParams.get('resourceType'))
      if (!parsedType.success || batchIds.length > 100) return NextResponse.json({ error: 'Invalid availability query' }, { status: 400 })
      const from = searchParams.get('from') ?? undefined
      const to = searchParams.get('to') ?? undefined
      const allowed = await Promise.all(batchIds.map((resourceId) => canManage(scope, parsedType.data, resourceId)))
      if (allowed.some((isAllowed) => !isAllowed)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const rows = await db.resourceAvailability.findMany({ where: { resourceType: parsedType.data, resourceId: { in: batchIds }, date: dateFilter(from, to) }, orderBy: { date: 'asc' } })
      return NextResponse.json({ resourceType: parsedType.data, resourceIds: batchIds, overrides: rows.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })) })
    }
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid availability query' }, { status: 400 })
    const { resourceType, resourceId, from, to } = parsed.data
    if (!(await canManage(scope, resourceType, resourceId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const rows = await db.resourceAvailability.findMany({
      where: { resourceType, resourceId, date: dateFilter(from, to) },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json({ overrides: rows.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })) })
  } catch (error) {
    console.error('Error reading resource availability:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    const bulk = bulkWriteSchema.safeParse(body)
    if (bulk.success) {
      const resourceIds = [...new Set(bulk.data.resourceIds)]
      const allowed = await Promise.all(resourceIds.map((resourceId) => canManage(scope, bulk.data.resourceType, resourceId)))
      if (allowed.some((isAllowed) => !isAllowed)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const normalizedDate = normalizeIsoDate(bulk.data.date)
      const calendarDate = new Date(`${normalizedDate}T00:00:00.000Z`)
      const previousRows = await db.resourceAvailability.findMany({
        where: { resourceType: bulk.data.resourceType, resourceId: { in: resourceIds }, date: calendarDate },
        select: { resourceId: true, state: true, reason: true },
      })
      const previousByResourceId = new Map(previousRows.map((row) => [row.resourceId, row]))
      const rows = await db.$transaction(resourceIds.map((resourceId) => db.resourceAvailability.upsert({
        where: { resourceType_resourceId_date: { resourceType: bulk.data.resourceType, resourceId, date: calendarDate } },
        update: { state: bulk.data.state, reason: bulk.data.reason || null },
        create: { resourceType: bulk.data.resourceType, resourceId, date: calendarDate, state: bulk.data.state, reason: bulk.data.reason || null },
      })))
      await db.actionLog.createMany({ data: rows.map((row) => ({
        adminId: scope.user.id,
        action: row.state === 'DISABLED' ? 'DISABLE_RESOURCE_DATE' : 'ENABLE_RESOURCE_DATE',
        entityType: 'RESOURCE_AVAILABILITY',
        entityId: row.resourceId,
        oldValues: JSON.stringify(previousByResourceId.get(row.resourceId) ?? null),
        newValues: JSON.stringify({ resourceType: row.resourceType, resourceId: row.resourceId, date: normalizedDate, state: row.state, reason: row.reason }),
        details: buildResourceDateAuditDetails({ result: 'APPLIED', resourceType: row.resourceType, date: normalizedDate, correlationKey: bulk.data.correlationKey ?? null }),
      })) }).catch((error) => console.error('Failed to log resource availability:', error))
      return NextResponse.json({ updated: rows.length, resourceType: bulk.data.resourceType, resourceIds, date: normalizedDate, state: bulk.data.state })
    }
    const parsed = writeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid availability payload' }, { status: 400 })
    const { resourceType, resourceId, date, state, reason, correlationKey } = parsed.data
    if (!(await canManage(scope, resourceType, resourceId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const normalizedDate = normalizeIsoDate(date)
    const calendarDate = new Date(`${normalizedDate}T00:00:00.000Z`)
    const previous = await db.resourceAvailability.findUnique({
      where: { resourceType_resourceId_date: { resourceType, resourceId, date: calendarDate } },
      select: { state: true, reason: true },
    })
    const row = await db.resourceAvailability.upsert({
      where: { resourceType_resourceId_date: { resourceType, resourceId, date: calendarDate } },
      update: { state, reason: reason || null },
      create: { resourceType, resourceId, date: calendarDate, state, reason: reason || null },
    })
    await db.actionLog.create({
      data: {
        adminId: scope.user.id,
        action: state === 'DISABLED' ? 'DISABLE_RESOURCE_DATE' : 'ENABLE_RESOURCE_DATE',
        entityType: 'RESOURCE_AVAILABILITY',
        entityId: resourceId,
        oldValues: JSON.stringify(previous ?? null),
        newValues: JSON.stringify({ resourceType, resourceId, date: normalizedDate, state: row.state, reason: row.reason }),
        details: buildResourceDateAuditDetails({ result: 'APPLIED', resourceType, date: normalizedDate, correlationKey: correlationKey ?? null }),
      },
    }).catch((error) => console.error('Failed to log resource availability:', error))
    return NextResponse.json({ override: { ...row, date: normalizedDate } })
  } catch (error) {
    console.error('Error writing resource availability:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = querySchema.extend({ date: z.string() }).safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid availability query' }, { status: 400 })
    const { resourceType, resourceId, date } = parsed.data
    const correlationKey = new URL(request.url).searchParams.get('correlationKey') ?? undefined
    const correlationKeySchema = z.string().trim().min(8).max(120)
    if (correlationKey !== undefined && !correlationKeySchema.safeParse(correlationKey).success) {
      return NextResponse.json({ error: 'Invalid availability query' }, { status: 400 })
    }
    if (!(await canManage(scope, resourceType, resourceId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const normalizedDate = normalizeIsoDate(date)
    const calendarDate = new Date(`${normalizedDate}T00:00:00.000Z`)
    const previous = await db.resourceAvailability.findUnique({
      where: { resourceType_resourceId_date: { resourceType, resourceId, date: calendarDate } },
      select: { state: true, reason: true },
    })
    await db.resourceAvailability.deleteMany({
      where: { resourceType, resourceId, date: calendarDate },
    })
    await db.actionLog.create({
      data: {
        adminId: scope.user.id,
        action: 'DELETE_RESOURCE_DATE',
        entityType: 'RESOURCE_AVAILABILITY',
        entityId: resourceId,
        oldValues: JSON.stringify(previous ?? null),
        newValues: JSON.stringify(null),
        details: buildResourceDateAuditDetails({ result: 'DELETED', resourceType, date: normalizedDate, correlationKey: correlationKey ?? null }),
      },
    }).catch((error) => console.error('Failed to log resource availability deletion:', error))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resource availability:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
