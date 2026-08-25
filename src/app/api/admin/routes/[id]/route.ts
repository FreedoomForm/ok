import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getAdminScope } from '@/lib/admin-scope'
import { normalizeOrderIds, normalizeRouteColor, normalizeRouteName, normalizeWeekStart } from '@/lib/routes/schedule'

const ADMIN_ROLES = ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'] as const

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

async function getRouteForUser(user: { id: string; role: string }, id: string) {
  const scope = await getAdminScope(user)
  return db.deliveryRoute.findFirst({ where: { id, ...(scope.groupAdminIds ? { ownerId: { in: scope.groupAdminIds } } : {}), ...(user.role === 'COURIER' ? { courierId: user.id } : {}) } })
}

async function getAllowedCourier(user: { id: string; role: string }, courierId: string) {
  const scope = await getAdminScope(user)
  return db.admin.findFirst({ where: { id: courierId, role: 'COURIER', isActive: true, ...(scope.groupAdminIds ? { createdBy: { in: scope.groupAdminIds } } : {}) }, select: { id: true } })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ADMIN_ROLES)) return errorResponse('Недостаточно прав', 403)
  const { id } = await context.params
  const current = await getRouteForUser(user, id)
  if (!current) return errorResponse('Маршрут не найден', 404)
  const currentStops = await db.deliveryRouteStop.findMany({ where: { routeId: id }, select: { orderId: true } })
  const existingOrderIds = currentStops.map((stop) => stop.orderId)
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const name = body?.name === undefined ? current.name : normalizeRouteName(body.name)
  const color = body?.color === undefined ? current.color : normalizeRouteColor(body.color)
  const courierId = body?.courierId === undefined ? current.courierId : typeof body.courierId === 'string' ? body.courierId : ''
  const weekStart = body?.weekStart === undefined ? current.weekStart : typeof body.weekStart === 'string' ? normalizeWeekStart(body.weekStart) : null
  const orderIds = body?.orderIds === undefined ? null : normalizeOrderIds(body.orderIds)
  if (!name || !color || !courierId || !weekStart || (body?.orderIds !== undefined && !orderIds)) return errorResponse('Некорректные данные маршрута')
  if (!(await getAllowedCourier(user, courierId))) return errorResponse('Курьер недоступен', 404)
  const stops = orderIds === null ? null : await db.order.findMany({ where: { id: { in: orderIds }, deletedAt: null, deliveryDate: { gte: weekStart, lt: new Date(weekStart.getTime() + 7 * 86400000) }, ...(await getAdminScope(user)).groupAdminIds ? { customer: { createdBy: { in: (await getAdminScope(user)).groupAdminIds! } } } : {} }, select: { id: true } })
  if (orderIds && stops?.length !== orderIds.length) return errorResponse('Заказы недоступны для этой недели', 404)
  const updated = await db.$transaction(async (tx) => {
    const route = await tx.deliveryRoute.update({ where: { id }, data: { name, color, courierId, weekStart, isActive: body?.isActive === undefined ? current.isActive : body.isActive === true, deletedAt: body?.deletedAt === null ? null : current.deletedAt } })
    const assignedOrderIds = orderIds ?? existingOrderIds
    if (orderIds) {
      await tx.deliveryRouteStop.deleteMany({ where: { routeId: id } })
      await tx.deliveryRouteStop.createMany({ data: orderIds.map((orderId, position) => ({ routeId: id, orderId, position })) })
      const removedOrderIds = existingOrderIds.filter((orderId) => !orderIds.includes(orderId))
      if (removedOrderIds.length) {
        await tx.order.updateMany({
          where: { id: { in: removedOrderIds }, courierId: current.courierId, routeStops: { none: { routeId: { not: id } } } },
          data: { courierId: null, sequenceInRoute: null },
        })
      }
    }
    if (assignedOrderIds.length) {
      await tx.order.updateMany({ where: { id: { in: assignedOrderIds } }, data: { courierId } })
      await Promise.all(assignedOrderIds.map((orderId, position) => tx.order.update({ where: { id: orderId }, data: { sequenceInRoute: position } })))
      if (courierId !== current.courierId) {
        await tx.orderAuditEvent.createMany({ data: assignedOrderIds.map((orderId) => ({ orderId, eventType: 'COURIER_ASSIGNED', actorAdminId: user.id, actorRole: user.role, message: 'Courier reassigned from route update' })) })
      }
    }
    return route
  })
  try {
    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: 'UPDATE_ROUTE',
        entityType: 'ROUTE',
        entityId: id,
        oldValues: JSON.stringify({ courierId: current.courierId, weekStart: current.weekStart.toISOString(), stopCount: existingOrderIds.length }),
        newValues: JSON.stringify({ courierId, weekStart: weekStart.toISOString(), stopCount: (orderIds ?? existingOrderIds).length }),
        description: `Updated route: ${updated.name}`,
      },
    })
  } catch (logError) {
    console.error('Failed to log route update:', logError)
  }
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ADMIN_ROLES)) return errorResponse('Недостаточно прав', 403)
  const { id } = await context.params
  const current = await getRouteForUser(user, id)
  if (!current) return errorResponse('Маршрут не найден', 404)
  const route = await db.deliveryRoute.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
  try {
    await db.actionLog.create({
      data: { adminId: user.id, action: 'DELETE_ROUTE', entityType: 'ROUTE', entityId: id, oldValues: JSON.stringify({ isActive: current.isActive, deletedAt: current.deletedAt }), newValues: JSON.stringify({ isActive: false, deletedAt: route.deletedAt }), description: `Deleted route: ${route.name}` },
    })
  } catch (logError) {
    console.error('Failed to log route deletion:', logError)
  }
  return NextResponse.json(route)
}
