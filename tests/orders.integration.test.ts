import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { buildOrderWhere } from '../src/lib/orders/query'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('queries scoped orders with pagination against PostgreSQL', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const orderNumber = 900000000 + (Date.now() % 1000000)
  let customerId: string | undefined
  let orderId: string | undefined

  try {
    const customer = await db.customer.create({
      data: {
        name: 'Integration Customer',
        phone: `+1555${String(orderNumber).slice(-7)}`,
        address: 'Integration Test Address',
        createdBy: 'test-admin',
        autoOrdersEnabled: false,
      },
    })
    customerId = customer.id

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        adminId: 'test-admin',
        orderStatus: 'PENDING',
        deliveryAddress: customer.address,
        deliveryDate: new Date('2026-08-21T00:00:00.000Z'),
        quantity: 1,
        calories: 1600,
      },
    })
    orderId = order.id

    const where = buildOrderWhere({
      role: 'SUPER_ADMIN',
      userId: 'test-admin',
      filters: { pending: true },
    })
    const [rows, total] = await Promise.all([
      db.order.findMany({ where, take: 1, skip: 0, orderBy: { createdAt: 'desc' } }),
      db.order.count({ where }),
    ])

    assert.ok(total >= 1)
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.id, order.id)
  } finally {
    if (orderId) await db.order.delete({ where: { id: orderId } })
    if (customerId) await db.customer.delete({ where: { id: customerId } })
    await db.$disconnect()
  }
})
