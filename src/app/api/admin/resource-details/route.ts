import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import {
  buildAdminContract,
  buildScopedAdminWhere,
  buildClientContract,
  buildOrderContract,
  isResourceDetailEntity,
  sortTransactionsByCreatedAt,
} from '@/lib/admin/resource-details'

const allowedRoles = ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'] as const


export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, [...allowedRoles])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const params = new URL(request.url).searchParams
    const entity = params.get('entity')
    const id = params.get('id')
    if (!isResourceDetailEntity(entity) || !id) {
      return NextResponse.json({ error: 'Invalid entity or id' }, { status: 400 })
    }

    const adminIds = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

    if (entity === 'order') {
      const order = await db.order.findFirst({
        where: { id, deletedAt: null, ...(adminIds ? { adminId: { in: adminIds } } : {}) },
        include: {
          customer: { include: { assignedSet: { select: { id: true, name: true } } } },
          courier: { select: { id: true, name: true, role: true } },
          events: {
            include: { actorAdmin: { select: { id: true, name: true, role: true } } },
            orderBy: { occurredAt: 'desc' },
            take: 120,
          },
        },
      })
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

      const transactions = await db.transaction.findMany({
        where: {
          customerId: order.customerId,
          ...(adminIds ? { adminId: { in: adminIds } } : {}),
          description: { contains: `#${order.orderNumber}` },
        },
        include: { admin: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      const contract = buildOrderContract(order)

      return NextResponse.json({
        entity,
        id,
        resource: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          customer: { id: order.customer.id, name: order.customer.name, phone: order.customer.phone },
          courier: order.courier,
          deliveryAddress: order.deliveryAddress,
          deliveryDate: order.deliveryDate,
          deliveryTime: order.deliveryTime,
        },
        transactions,
        contracts: [contract],
        actions: order.events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          createdAt: event.occurredAt,
          actorName: event.actorName || event.actorAdmin?.name || 'System',
          message: event.message,
          previousStatus: event.previousStatus,
          nextStatus: event.nextStatus,
        })),
        relatedOrders: [],
      })
    }

    if (entity === 'client') {
      const client = await db.customer.findFirst({
        where: { id, ...(adminIds ? { createdBy: { in: adminIds } } : {}) },
        include: {
          assignedSet: { select: { id: true, name: true } },
          defaultCourier: { select: { id: true, name: true, role: true } },
          orders: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
              id: true,
              orderNumber: true,
              orderStatus: true,
              paymentStatus: true,
              deliveryDate: true,
              createdAt: true,
              amountReceived: true,
            },
          },
          transactions: {
            include: { admin: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
        },
      })
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

      const actions = await db.actionLog.findMany({
        where: {
          entityId: client.id,
          ...(adminIds ? { adminId: { in: adminIds } } : {}),
        },
        include: { admin: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      const contract = buildClientContract(client)

      return NextResponse.json({
        entity,
        id,
        resource: {
          id: client.id,
          name: client.name,
          nickName: client.nickName,
          phone: client.phone,
          address: client.address,
          balance: client.balance,
          dailyPrice: client.dailyPrice,
          planType: client.planType,
          isActive: client.isActive,
          assignedSet: client.assignedSet,
          defaultCourier: client.defaultCourier,
        },
        transactions: client.transactions,
        contracts: [contract],
        actions,
        relatedOrders: client.orders,
      })
    }

    const admin = await db.admin.findFirst({
      where: buildScopedAdminWhere(id, adminIds),
      include: {
        transactions: {
          include: { customer: { select: { id: true, name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        salaryReceivedTransactions: {
          include: { customer: { select: { id: true, name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        courierOrders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            paymentStatus: true,
            deliveryDate: true,
            createdAt: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    })
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })

    const actions = await db.actionLog.findMany({
      where: { adminId: admin.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
const transactions = sortTransactionsByCreatedAt([...admin.transactions, ...admin.salaryReceivedTransactions])
    const contract = buildAdminContract(admin)

    return NextResponse.json({
      entity,
      id,
      resource: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        salary: admin.salary,
        companyBalance: admin.companyBalance,
        transportType: admin.transportType,
        vehicleNumber: admin.vehicleNumber,
      },
      transactions,
      contracts: [contract],
      actions,
      relatedOrders: admin.courierOrders,
    })
  } catch (error) {
    console.error('Resource detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
