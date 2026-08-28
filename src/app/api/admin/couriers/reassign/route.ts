import { OrderStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { getAffectedFutureCourierOrders } from '@/lib/admin/courier-lifecycle'
import { buildCourierAssignmentNotification, createCourierAssignmentNotification } from '@/lib/chat/notifications'
import { courierReassignmentSchema, getReassignmentOrderIds } from '@/lib/admin/courier-reassignment'

const operationalOrderWhere = (courierId: string, orderIds?: string[]) => ({
  courierId,
  deletedAt: null,
  deliveryDate: { not: null, gte: new Date() },
  orderStatus: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELED] },
  ...(orderIds ? { id: { in: orderIds } } : {}),
})

async function getScope(user: { id: string; role: string }) {
  return user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)
}

function orderView(order: { id: string; orderNumber: number; deliveryDate: Date | null; orderStatus: string; customer?: { name: string | null } }) {
  return { id: order.id, orderNumber: order.orderNumber, deliveryDate: order.deliveryDate, orderStatus: order.orderStatus, ...(order.customer ? { customerName: order.customer.name } : {}) }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    const courierId = new URL(request.url).searchParams.get('courierId')?.trim() ?? ''
    if (!courierId || courierId.length > 128) return NextResponse.json({ error: 'Некорректный courierId' }, { status: 400 })
    const groupAdminIds = await getScope(user)
    const scope = groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}
    const [courier, orders, availableCouriers] = await Promise.all([
      db.admin.findFirst({ where: { id: courierId, role: 'COURIER', ...scope }, select: { id: true, name: true, isActive: true, deletedAt: true } }),
      db.order.findMany({ where: operationalOrderWhere(courierId), select: { id: true, orderNumber: true, deliveryDate: true, orderStatus: true, customer: { select: { name: true } } }, orderBy: { deliveryDate: 'asc' }, take: 500 }),
      db.admin.findMany({ where: { role: 'COURIER', isActive: true, deletedAt: null, id: { not: courierId }, ...scope }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 500 }),
    ])
    if (!courier) return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
    return NextResponse.json({ courier, affectedOrders: getAffectedFutureCourierOrders(orders, new Date()).map(orderView), availableCouriers })
  } catch (error) {
    console.error('Error loading courier reassignment:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    const parsed = courierReassignmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректное распределение' }, { status: 400 })

    const groupAdminIds = await getScope(user)
    const scope = groupAdminIds ? { createdBy: { in: groupAdminIds } } : {}
    const orderIds = getReassignmentOrderIds(parsed.data)
    const assignmentsByCourier = new Map<string, string[]>()
    for (const assignment of parsed.data.assignments) {
      const ids = assignmentsByCourier.get(assignment.targetCourierId) ?? []
      ids.push(assignment.orderId)
      assignmentsByCourier.set(assignment.targetCourierId, ids)
    }

    const result = await db.$transaction(async (tx) => {
      const [source, targets, affected] = await Promise.all([
        tx.admin.findFirst({ where: { id: parsed.data.courierId, role: 'COURIER', ...scope }, select: { id: true, name: true, isActive: true, deletedAt: true } }),
        tx.admin.findMany({ where: { id: { in: [...assignmentsByCourier.keys()] }, role: 'COURIER', isActive: true, deletedAt: null, ...scope }, select: { id: true, name: true } }),
        tx.order.findMany({ where: operationalOrderWhere(parsed.data.courierId), select: { id: true, orderNumber: true, deliveryDate: true, orderStatus: true, customer: { select: { name: true } } }, orderBy: { deliveryDate: 'asc' }, take: 500 }),
      ])
      if (!source) return { kind: 'not-found' as const }
      if (targets.length !== assignmentsByCourier.size) return { kind: 'target-unavailable' as const }
      const affectedOrders = getAffectedFutureCourierOrders(affected, new Date())
      const affectedIds = new Set(affectedOrders.map((order) => order.id))
      if (affectedIds.size !== orderIds.length || orderIds.some((id) => !affectedIds.has(id))) return { kind: 'stale' as const, affectedOrders: affectedOrders.map(orderView) }

      for (const [targetCourierId, targetOrderIds] of assignmentsByCourier) {
        const updated = await tx.order.updateMany({ where: operationalOrderWhere(parsed.data.courierId, targetOrderIds), data: { courierId: targetCourierId, sequenceInRoute: null } })
        if (updated.count !== targetOrderIds.length) return { kind: 'stale' as const, affectedOrders: affectedOrders.map(orderView) }
        await tx.deliveryRouteStop.deleteMany({ where: { orderId: { in: targetOrderIds } } })
        await tx.orderAuditEvent.createMany({ data: targetOrderIds.map((orderId) => ({ orderId, eventType: 'COURIER_ASSIGNED', actorAdminId: user.id, actorRole: user.role, message: `Courier reassigned from ${source.name}` })) })
        const target = targets.find((candidate) => candidate.id === targetCourierId)
        const movedOrders = affectedOrders.filter((order) => targetOrderIds.includes(order.id))
        const dates = movedOrders.map((order) => order.deliveryDate).filter((date): date is Date => date instanceof Date).sort((left, right) => left.getTime() - right.getTime())
        const dateRange = dates.length === 0 ? 'будущие даты' : dates.length === 1 ? dates[0].toISOString().slice(0, 10) : `${dates[0].toISOString().slice(0, 10)} — ${dates[dates.length - 1].toISOString().slice(0, 10)}`
        await createCourierAssignmentNotification(tx, {
          actorAdminId: user.id,
          courierId: targetCourierId,
          content: buildCourierAssignmentNotification({ courierName: target?.name ?? 'курьер', orderNumbers: movedOrders.map((order) => order.orderNumber), dateRange }),
        })
      }

      const residual = await tx.order.findMany({ where: operationalOrderWhere(parsed.data.courierId), select: { id: true, orderNumber: true, deliveryDate: true, orderStatus: true, customer: { select: { name: true } } }, orderBy: { deliveryDate: 'asc' }, take: 500 })
      if (residual.length > 0) return { kind: 'stale' as const, affectedOrders: getAffectedFutureCourierOrders(residual, new Date()).map(orderView) }
      const disabled = await tx.admin.update({ where: { id: source.id }, data: { isActive: false }, select: { id: true, name: true, isActive: true, deletedAt: true } })
      await tx.actionLog.create({ data: { adminId: user.id, action: 'REASSIGN_AND_DISABLE_COURIER', entityType: 'ADMIN', entityId: source.id, oldValues: JSON.stringify({ isActive: source.isActive, deletedAt: source.deletedAt }), newValues: JSON.stringify({ isActive: disabled.isActive, deletedAt: disabled.deletedAt, assignments: parsed.data.assignments }), details: `Migrated ${orderIds.length} future orders before disabling courier` } })
      return { kind: 'ok' as const, courier: disabled, reassignedOrderIds: orderIds }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.kind === 'not-found') return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
    if (result.kind === 'target-unavailable') return NextResponse.json({ error: 'Целевой курьер недоступен' }, { status: 409 })
    if (result.kind === 'stale') return NextResponse.json({ error: 'REASSIGN_REQUIRED', affectedOrders: result.affectedOrders }, { status: 409 })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return NextResponse.json({ error: 'REASSIGN_RETRY_REQUIRED' }, { status: 409 })
    console.error('Error reassigning courier:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
