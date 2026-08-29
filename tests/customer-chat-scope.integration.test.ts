import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { resolveScopedCustomerThread } from '../src/lib/customers/chat-scope'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('customer chat thread scope enforces ownership, role override and soft deletes', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const ownerId = `integration-chat-owner-${suffix}`
  const otherId = `integration-chat-other-${suffix}`
  const phone = `+1977${String(Date.now()).slice(-7)}`
  let customerId: string | undefined

  try {
    const owner = await db.admin.create({ data: { id: ownerId, email: `${ownerId}@example.test`, name: 'Chat Owner Admin', role: 'MIDDLE_ADMIN' } })
    const other = await db.admin.create({ data: { id: otherId, email: `${otherId}@example.test`, name: 'Chat Other Admin', role: 'MIDDLE_ADMIN' } })
    const customer = await db.customer.create({ data: { name: 'Chat Scope Customer', phone, address: 'Chat Scope Address', createdBy: owner.id, autoOrdersEnabled: false } })
    customerId = customer.id

    const inScope = await resolveScopedCustomerThread(db, customer.id, owner.id, 'MIDDLE_ADMIN')
    assert.equal(inScope?.id, customer.id)

    const outOfScope = await resolveScopedCustomerThread(db, customer.id, other.id, 'MIDDLE_ADMIN')
    assert.equal(outOfScope, null)

    const superOverride = await resolveScopedCustomerThread(db, customer.id, other.id, 'SUPER_ADMIN')
    assert.equal(superOverride?.id, customer.id)

    const unknown = await resolveScopedCustomerThread(db, 'missing-customer-id', owner.id, 'SUPER_ADMIN')
    assert.equal(unknown, null)

    await db.customer.update({ where: { id: customer.id }, data: { deletedAt: new Date() } })
    const deleted = await resolveScopedCustomerThread(db, customer.id, owner.id, 'SUPER_ADMIN')
    assert.equal(deleted, null)
    await db.customer.update({ where: { id: customer.id }, data: { deletedAt: null } })

    const missing = await db.admin.findUnique({ where: { id: other.id }, select: { id: true } })
    assert.equal(missing?.id, otherId)
    assert.equal(owner.id, ownerId)
  } finally {
    await Promise.allSettled([
      ...(customerId ? [db.customerMessage.deleteMany({ where: { customerId } }), db.customer.delete({ where: { id: customerId } })] : []),
      db.admin.delete({ where: { id: otherId } }).catch(() => undefined),
      db.admin.delete({ where: { id: ownerId } }).catch(() => undefined),
    ])
    await db.$disconnect()
  }
})
