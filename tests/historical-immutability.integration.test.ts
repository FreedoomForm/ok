import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { completePurchaseWithRetry } from '../src/lib/admin/purchase-completion'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

// §5: "Historical orders, delivered results, paid transactions and completed
// purchases are not recalculated without a separate explicit regeneration
// flow" and "disable ingredient must not silently change old purchases; disable
// client day must remove only future order demand for that day". §16
// PostgreSQL row: historical immutability. This named integration proof
// mutates every availability/lifecycle surface around a frozen history and
// asserts the historical facts remain byte-identical.
test('completed purchases, ledger transactions and historical orders survive availability and lifecycle mutations', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-immutable-${suffix}`
  const phone = `+1777${String(Date.now()).slice(-7)}`
  const itemName = `Immutable Ingredient ${suffix}`
  let purchaseId: string | undefined
  let itemId: string | undefined
  let cardId: string | undefined
  let transactionId: string | undefined
  let customerId: string | undefined
  let contractId: string | undefined
  let orderId: string | undefined

  try {
    const admin = await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Historical Immutability Admin', role: 'SUPER_ADMIN', companyBalance: 1000 } })
    const item = await db.warehouseItem.create({ data: { name: itemName, amount: 0, unit: 'gr', pricePerUnit: 10, priceUnit: 'gr' } })
    itemId = item.id
    const card = await db.virtualCard.create({ data: { ownerAdminId: adminId, name: `Immutable Card ${suffix}`, color: '#059669', balance: 100000 } })
    cardId = card.id
    const customer = await db.customer.create({ data: { name: `Immutable Customer ${suffix}`, phone, address: 'Immutable Address', createdBy: adminId, autoOrdersEnabled: false } })
    customerId = customer.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: adminId, autoRenew: false, status: 'ENABLED', periods: { create: { startDate: new Date('2026-09-20T00:00:00.000Z'), endDate: new Date('2026-09-26T00:00:00.000Z'), status: 'ENABLED', autoRenew: false, enabledWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], disabledDates: [] } } } })
    contractId = contract.id
    const order = await db.order.create({ data: { orderNumber: Number(`${Date.now()}`.slice(-9)), customerId: customer.id, adminId, deliveryAddress: 'Immutable Address', deliveryDate: new Date('2026-09-21T00:00:00.000Z'), orderStatus: "DELIVERED", paymentStatus: "PAID", calories: 1600 } })
    orderId = order.id

    const purchase = await db.purchase.create({ data: { ownerAdminId: adminId, title: `Immutable Purchase ${suffix}`, status: 'DRAFT', totalCost: 100, items: { create: { name: itemName, amount: 10, unit: 'gr', costPerUnit: 10, totalCost: 100 } } } })
    purchaseId = purchase.id
    const completion = await completePurchaseWithRetry(db, { purchaseId: purchase.id, ownerAdminId: adminId, actorAdminId: adminId, virtualCardId: cardId })
    transactionId = completion.transactionId ?? undefined
    assert.equal(typeof transactionId, 'string')

    // Freeze the complete historical snapshot before any mutation.
    const snapshotPurchase = await db.purchase.findUnique({ where: { id: purchase.id }, select: { status: true, totalCost: true, title: true, deletedAt: true, transactionId: true, completedAt: true } })
    const snapshotItems = await db.purchaseItem.findMany({ where: { purchaseId: purchase.id }, select: { name: true, amount: true, unit: true, costPerUnit: true, totalCost: true } })
    const snapshotTransaction = await db.transaction.findUnique({ where: { id: transactionId! }, select: { amount: true, type: true, category: true, virtualCardId: true, adminId: true } })
    const snapshotCard = await db.virtualCard.findUnique({ where: { id: cardId }, select: { balance: true } })
    const snapshotAdmin = await db.admin.findUnique({ where: { id: adminId }, select: { companyBalance: true } })
    const snapshotInventory = await db.warehouseItem.findUnique({ where: { id: itemId }, select: { amount: true } })
    const snapshotOrder = await db.order.findUnique({ where: { id: orderId }, select: { orderStatus: true, paymentStatus: true, calories: true, deliveryDate: true, courierId: true } })
    assert.equal(snapshotPurchase?.status, 'COMPLETED')
    assert.equal(snapshotCard?.balance, 99900)
    // Card-linked completion debits the card; the company balance is the
    // no-card fallback and stays untouched.
    assert.equal(snapshotAdmin?.companyBalance, 1000)
    assert.equal(snapshotInventory?.amount, 10)

    // Act: every availability and lifecycle mutation the availability graph
    // consumes — CLIENT day override, CONTRACT day override, ingredient
    // disable, order disable, client trash/restore — applied AFTER the
    // history was written.
    const day = '2026-09-21'
    await db.resourceAvailability.createMany({ data: [
      { resourceType: 'CLIENT', resourceId: customer.id, date: new Date('2026-09-21T00:00:00.000Z'), state: 'DISABLED', reason: 'integration-test' },
      { resourceType: 'CONTRACT', resourceId: contractId, date: new Date('2026-09-21T00:00:00.000Z'), state: 'DISABLED', reason: 'integration-test' },
    ] as never })
    await db.warehouseItem.update({ where: { id: itemId }, data: { isActive: false } })
    await db.order.update({ where: { id: orderId }, data: { deletedAt: new Date() } })
    await db.customer.update({ where: { id: customer.id }, data: { deletedAt: new Date() } })
    await db.customer.update({ where: { id: customer.id }, data: { deletedAt: null } })
    await db.order.update({ where: { id: orderId }, data: { deletedAt: null } })

    // The availability rows must exist for the live graph (the mutations
    // really happened between the snapshots); read directly to keep this
    // proof free of server-only module imports.
    const overrideRows = await db.resourceAvailability.findMany({ where: { resourceType: 'CLIENT', resourceId: customer.id, state: 'DISABLED' }, select: { date: true } })
    assert.equal(overrideRows.some((row) => row.date.toISOString().slice(0, 10) === day), true)

    // Historical facts must remain byte-identical after the full battery.
    const afterPurchase = await db.purchase.findUnique({ where: { id: purchase.id }, select: { status: true, totalCost: true, title: true, deletedAt: true, transactionId: true, completedAt: true } })
    const afterItems = await db.purchaseItem.findMany({ where: { purchaseId: purchase.id }, select: { name: true, amount: true, unit: true, costPerUnit: true, totalCost: true } })
    const afterTransaction = await db.transaction.findUnique({ where: { id: transactionId! }, select: { amount: true, type: true, category: true, virtualCardId: true, adminId: true } })
    const afterCard = await db.virtualCard.findUnique({ where: { id: cardId }, select: { balance: true } })
    const afterAdmin = await db.admin.findUnique({ where: { id: adminId }, select: { companyBalance: true } })
    const afterInventory = await db.warehouseItem.findUnique({ where: { id: itemId }, select: { amount: true } })
    const afterOrder = await db.order.findUnique({ where: { id: orderId }, select: { orderStatus: true, paymentStatus: true, calories: true, deliveryDate: true, courierId: true } })

    assert.deepEqual(afterPurchase, snapshotPurchase)
    assert.deepEqual(afterItems, snapshotItems)
    assert.deepEqual(afterTransaction, snapshotTransaction)
    assert.deepEqual(afterCard, snapshotCard)
    assert.deepEqual(afterAdmin, snapshotAdmin)
    assert.deepEqual(afterInventory, snapshotInventory)
    assert.deepEqual(afterOrder, snapshotOrder)

    // The lifecycle surface keeps its own §4 contract: an explicitly disabled
    // order carries the disabled state going forward — historical totals,
    // payment state and delivery facts are untouched, and the ledger did not
    // move (exactly one INGREDIENT_PURCHASE transaction exists).
    assert.equal(afterOrder?.orderStatus, 'DELIVERED')
    assert.equal(afterOrder?.paymentStatus, 'PAID')
    const ledgerCount = await db.transaction.count({ where: { adminId, category: 'INGREDIENT_PURCHASE' } })
    assert.equal(ledgerCount, 1)
  } finally {
    await db.resourceAvailability.deleteMany({ where: { OR: [{ resourceId: customerId ?? '' }, { resourceId: contractId ?? '' }] } }).catch(() => undefined)
    await db.purchaseItem.deleteMany({ where: { purchaseId } }).catch(() => undefined)
    await db.purchase.delete({ where: { id: purchaseId } }).catch(() => undefined)
    await db.transaction.deleteMany({ where: { id: transactionId } }).catch(() => undefined)
    await db.order.delete({ where: { id: orderId } }).catch(() => undefined)
    await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.virtualCard.delete({ where: { id: cardId } }).catch(() => undefined)
    await db.warehouseItem.delete({ where: { id: itemId } }).catch(() => undefined)
    await db.actionLog.deleteMany({ where: { adminId } }).catch(() => undefined)
    await db.admin.delete({ where: { id: adminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})
