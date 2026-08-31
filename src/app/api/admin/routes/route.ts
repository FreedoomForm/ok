import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getAdminScope } from '@/lib/admin-scope'
import { normalizeOrderIds, normalizeRouteBoundary, normalizeRouteColor, normalizeRouteName, normalizeWeekStart } from '@/lib/routes/schedule'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { loadContractOverriddenDatesByCustomer, filterRowsOnContractOverrides } from '@/lib/admin/contract-effective'
import { filterEffectiveRouteStops } from '@/lib/routes/availability'

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
    where: { id: courierId, role: 'COURIER', isActive: true, ...(scope.groupAdminIds ? { createdBy: { in: scope.groupAdminIds } } : {}) },
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
    select: { id: true, customerId: true, deliveryDate: true },
  })
  if (rows.length !== orderIds.length) return false
  const disabledDates = await getDisabledResourceDates('CLIENT', [...new Set(rows.map((row) => row.customerId))], weekStart, weekEnd)
  const clientEffective = rows.filter((row) => !row.deliveryDate || !disabledDates.get(row.customerId)?.has(toAvailabilityDateKey(row.deliveryDate)))
  const contractEffective = await filterRowsOnContractOverrides(clientEffective, weekStart, weekEnd)
  return contractEffective.length === rows.length
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, [...ADMIN_ROLES, 'COURIER'])) return jsonError('Недостаточно прав', 403)
  const weekStart = normalizeWeekStart(request.nextUrl.searchParams.get('weekStart') || new Date())
  if (!weekStart) return jsonError('Некорректная неделя')
  const search = request.nextUrl.searchParams.get('search')?.trim().slice(0, 120) ?? ''
  const routes = await db.deliveryRoute.findMany({
    where: {
      ...(await scopedWhere(user)),
      weekStart,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { courier: { name: { contains: search, mode: 'insensitive' } } }] } : {}),
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      courier: { select: { id: true, name: true } },
      stops: {
        orderBy: { position: 'asc' },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                  contracts: {
                    where: { status: { not: 'DELETED' } },
                    select: {
                      status: true,
                      periods: { select: { startDate: true, endDate: true, status: true, enabledWeekdays: true, disabledDates: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  const stopCustomerIds = [...new Set(routes.flatMap((route) => route.stops.map((stop) => stop.order.customerId)))]
  const stopIds = routes.flatMap((route) => route.stops.map((stop) => stop.id))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const [disabledDates, disabledRouteDates, disabledStopDates, contractOverriddenDates] = await Promise.all([
    getDisabledResourceDates('CLIENT', stopCustomerIds, weekStart, weekEnd),
    getDisabledResourceDates('ROUTE', routes.map((route) => route.id), weekStart, weekEnd),
    getDisabledResourceDates('ROUTE_STOP', stopIds, weekStart, weekEnd),
    loadContractOverriddenDatesByCustomer(stopCustomerIds, weekStart, weekEnd),
  ])
  const effectiveRoutes = routes.map((route) => {
    const availabilityStops = route.stops.map((stop) => ({
      ...stop,
      order: {
        ...stop.order,
        contractPeriods: stop.order.customer.contracts.flatMap((contract) => contract.periods.map((period) => ({
          customerId: stop.order.customerId,
          startDate: period.startDate.toISOString().slice(0, 10),
          endDate: period.endDate.toISOString().slice(0, 10),
          isActive: contract.status === 'ENABLED' && period.status === 'ENABLED',
          enabledWeekdays: Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays.filter((day): day is string => typeof day === 'string') : [],
          disabledDates: Array.isArray(period.disabledDates) ? period.disabledDates.filter((date): date is string => typeof date === 'string') : [],
        }))),
      },
    }))
    const effectiveStopIds = new Set(filterEffectiveRouteStops(availabilityStops, disabledDates, disabledRouteDates.get(route.id), disabledStopDates, contractOverriddenDates).map((stop) => stop.id))
    return {
      ...route,
      stops: route.stops.filter((stop) => effectiveStopIds.has(stop.id)).map((stop) => {
        const { contracts: _contracts, ...customer } = stop.order.customer
        return { ...stop, order: { ...stop.order, customer } }
      }),
    }
  })
  return NextResponse.json(effectiveRoutes)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ADMIN_ROLES)) return jsonError('Недостаточно прав', 403)
  const scope = await getAdminScope(user)
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const name = normalizeRouteName(body?.name)
  const color = normalizeRouteColor(body?.color)
  const weekStart = typeof body?.weekStart === 'string' ? normalizeWeekStart(body.weekStart) : null
  const courierId = typeof body?.courierId === 'string' ? body.courierId : ''
  const orderIds = normalizeOrderIds(body?.orderIds ?? [])
  const boundary = body?.boundary === undefined || body?.boundary === null ? null : normalizeRouteBoundary(body.boundary)
  if (!name || !color || !weekStart || !courierId || !orderIds || (body?.boundary !== undefined && body?.boundary !== null && !boundary)) return jsonError('Некорректные данные маршрута')
  if (!(await canUseCourier(user, courierId))) return jsonError('Курьер недоступен', 404)
  if (!(await canUseOrders(user, orderIds, weekStart))) return jsonError('Заказы недоступны для этой недели', 404)
  const route = await db.$transaction(async (tx) => {
    const created = await tx.deliveryRoute.create({ data: { name, color, weekStart, courierId, ...(boundary ? { boundary } : {}), ownerId: scope.ownerAdminId ?? user.id } })
    if (orderIds.length) {
      await tx.deliveryRouteStop.createMany({ data: orderIds.map((orderId, position) => ({ routeId: created.id, orderId, position })) })
      await Promise.all(orderIds.map((orderId, position) => tx.order.update({ where: { id: orderId }, data: { courierId, sequenceInRoute: position } })))
    }
    return created
  })
  try {
    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: 'CREATE_ROUTE',
        entityType: 'ROUTE',
        entityId: route.id,
        details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'CREATE_ROUTE', entity: 'ROUTE' } }),
        newValues: JSON.stringify({ name: route.name, color: route.color, courierId: route.courierId, weekStart: route.weekStart.toISOString(), boundary: route.boundary, stopCount: orderIds.length }),
        description: `Created route: ${route.name}`,
      },
    })
  } catch (logError) {
    console.error('Failed to log route creation:', logError)
  }
  return NextResponse.json(route, { status: 201 })
}
