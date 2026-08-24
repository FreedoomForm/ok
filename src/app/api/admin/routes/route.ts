import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getAdminScope } from '@/lib/admin-scope'
import { normalizeOrderIds, normalizeRouteColor, normalizeRouteName, normalizeWeekStart } from '@/lib/routes/schedule'

const ADMIN_ROLES = ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'] as const

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

async function scopedWhere(user: { id: string; role: string }) {
  if (user.role === 'COURIER') return { courierId: user.id }
  const scope = await getAdminScope(user)
  return scope.groupAdminIds ? { ownerId: { in: scope.groupAdminIds } } : {}
}

async function canUseCourier(user: { id: string; role: string }, courierId: string) {
  const scope = await getAdminScope(user)
  const courier = await db.admin.findFirst({
    where: { id: courierId, role: 'COURIER', ...(scope.groupAdminIds ? { createdBy: { in: scope.groupAdminIds } } : {}) },
    select: { id: true },
  })
  return Boolean(courier)
}

async function canUseOrders(user: { id: string; role: string }, orderIds: string[], weekStart: Date) {
  const scope = await getAdminScope(user)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const rows = await db.order.findMany({
    where: {
      id: { in: orderIds },
      deletedAt: null,
      deliveryDate: { gte: weekStart, lt: weekEnd },
      ...(scope.groupAdminIds ? { customer: { createdBy: { in: scope.groupAdminIds } } } : {}),
    },
    select: { id: true },
  })
  return rows.length === orderIds.length
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, [...ADMIN_ROLES, 'COURIER'])) return jsonError('Недостаточно прав', 403)
  const weekStart = normalizeWeekStart(request.nextUrl.searchParams.get('weekStart') || new Date())
  if (!weekStart) return jsonError('Некорректная неделя')
  const routes = await db.deliveryRoute.findMany({
    where: { ...(await scopedWhere(user)), weekStart },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      courier: { select: { id: true, name: true } },
      stops: {
        orderBy: { position: 'asc' },
        include: { order: { include: { customer: { select: { id: true, name: true, latitude: true, longitude: true } } } } },
      },
    },
  })
  return NextResponse.json(routes)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ADMIN_ROLES)) return jsonError('Недостаточно прав', 403)
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const name = normalizeRouteName(body?.name)
  const color = normalizeRouteColor(body?.color)
  const weekStart = typeof body?.weekStart === 'string' ? normalizeWeekStart(body.weekStart) : null
  const courierId = typeof body?.courierId === 'string' ? body.courierId : ''
  const orderIds = normalizeOrderIds(body?.orderIds ?? [])
  if (!name || !color || !weekStart || !courierId || !orderIds) return jsonError('Некорректные данные маршрута')
  if (!(await canUseCourier(user, courierId))) return jsonError('Курьер недоступен', 404)
  if (!(await canUseOrders(user, orderIds, weekStart))) return jsonError('Заказы недоступны для этой недели', 404)
  const route = await db.$transaction(async (tx) => {
    const created = await tx.deliveryRoute.create({ data: { name, color, weekStart, courierId, ownerId: user.id } })
    if (orderIds.length) {
      await tx.deliveryRouteStop.createMany({ data: orderIds.map((orderId, position) => ({ routeId: created.id, orderId, position })) })
      await Promise.all(orderIds.map((orderId, position) => tx.order.update({ where: { id: orderId }, data: { courierId, sequenceInRoute: position } })))
    }
    return created
  })
  return NextResponse.json(route, { status: 201 })
}
