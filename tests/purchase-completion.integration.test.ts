import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { completePurchaseWithRetry } from '../src/lib/admin/purchase-completion'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('purchase completion is idempotent under concurrent PostgreSQL Finish calls', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-purchase-${suffix}`
  const itemName = `Concurrent Ingredient ${suffix}`
  const purchaseTitle = `Concurrent Purchase ${suffix}`
  let purchaseId: string | undefined
  let itemId: string | undefined
  let transactionIds: string[] = []

  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Purchase Integration Admin', role: 'SUPER_ADMIN', companyBalance: 1000 } })
    const item = await db.warehouseItem.create({ data: { name: itemName, amount: 0, unit: 'gr', pricePerUnit: 10, priceUnit: 'gr' } })
    itemId = item.id
    const purchase = await db.purchase.create({ data: { ownerAdminId: adminId, title: purchaseTitle, status: 'DRAFT', totalCost: 100, items: { create: { name: itemName, amount: 10, unit: 'gr', costPerUnit: 10, totalCost: 100 } } } })
    purchaseId = purchase.id

    const results = await Promise.all([
      completePurchaseWithRetry(db, { purchaseId: purchase.id, ownerAdminId: adminId, actorAdminId: adminId }),
      completePurchaseWithRetry(db, { purchaseId: purchase.id, ownerAdminId: adminId, actorAdminId: adminId }),
    ])
    transactionIds = results.map((result) => result.transactionId).filter((id): id is string => typeof id === 'string')

    const [storedPurchase, storedAdmin, storedItem, transactionCount] = await Promise.all([
      db.purchase.findUnique({ where: { id: purchase.id }, select: { status: true, transactionId: true } }),
      db.admin.findUnique({ where: { id: adminId }, select: { companyBalance: true } }),
      db.warehouseItem.findUnique({ where: { id: item.id }, select: { amount: true } }),
      db.transaction.count({ where: { adminId, category: 'INGREDIENT_PURCHASE' } }),
    ])

    assert.equal(new Set(transactionIds).size, 1)
    assert.equal(storedPurchase?.status, 'COMPLETED')
    assert.equal(storedPurchase?.transactionId, transactionIds[0])
    assert.equal(storedAdmin?.companyBalance, 900)
    assert.equal(storedItem?.amount, 10)
    assert.equal(transactionCount, 1)
  } finally {
    await db.purchase.deleteMany({ where: { id: purchaseId } })
    await db.transaction.deleteMany({ where: { id: { in: transactionIds } } })
    await Promise.allSettled([
      ...(itemId ? [db.warehouseItem.delete({ where: { id: itemId } })] : []),
      db.admin.delete({ where: { id: adminId } }),
    ])
    await db.$disconnect()
  }
})
