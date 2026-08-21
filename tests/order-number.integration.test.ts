import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { allocateOrderNumber } from '../src/lib/orders/number'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('allocates unique order numbers across concurrent PostgreSQL transactions', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  let customerId: string | undefined
  const orderIds: string[] = []

  try {
    const customer = await db.customer.create({
      data: {
        name: 'Order Number Integration Customer',
        phone: `+1556${process.pid}${Date.now().toString().slice(-7)}`,
        address: 'Integration Test Address',
        createdBy: 'test-admin',
        autoOrdersEnabled: false,
      },
    })
    customerId = customer.id

    const createdOrders = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        db.$transaction(async (tx) => {
          const orderNumber = await allocateOrderNumber(tx)
          return tx.order.create({
            data: {
              orderNumber,
              customerId: customer.id,
              adminId: 'test-admin',
              orderStatus: 'NEW',
              deliveryAddress: customer.address,
              deliveryDate: new Date(`2026-08-${22 + index}T00:00:00.000Z`),
              quantity: 1,
              calories: 1600,
            },
            select: { id: true, orderNumber: true },
          })
        }),
      ),
    )

    orderIds.push(...createdOrders.map((order) => order.id))
    const numbers = createdOrders.map((order) => order.orderNumber).sort((a, b) => a - b)

    assert.equal(new Set(numbers).size, numbers.length)
    assert.deepEqual(
      numbers,
      Array.from({ length: numbers.length }, (_, index) => numbers[0] + index),
    )
  } finally {
    await Promise.allSettled([
      ...orderIds.map((id) => db.order.delete({ where: { id } })),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
    ])
    await db.$disconnect()
  }
})
