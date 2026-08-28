import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { renewOneContractPeriodWithRetry } from '../src/lib/contracts/renewal-transaction'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('contract renewal is idempotent under concurrent PostgreSQL scheduler calls', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-renewal-${suffix}`
  const phone = `+1555${String(Date.now()).slice(-7)}`
  let customerId: string | undefined
  let contractId: string | undefined

  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Renewal Integration Admin', role: 'SUPER_ADMIN' } })
    const customer = await db.customer.create({ data: { name: 'Renewal Integration Customer', phone, address: 'Renewal Test Address', createdBy: adminId, autoOrdersEnabled: false } })
    customerId = customer.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: adminId, autoRenew: true, status: 'ENABLED', periods: { create: { startDate: new Date('2026-08-25T00:00:00.000Z'), endDate: new Date('2026-08-31T00:00:00.000Z'), status: 'ENABLED', autoRenew: true, enabledWeekdays: ['MONDAY', 'TUESDAY'], disabledDates: [] } } } })
    contractId = contract.id

    const created = await Promise.all([
      renewOneContractPeriodWithRetry(db, contract.id, new Date('2026-09-01T00:00:00.000Z')),
      renewOneContractPeriodWithRetry(db, contract.id, new Date('2026-09-01T00:00:00.000Z')),
    ])
    const periods = await db.contractPeriod.findMany({ where: { contractId: contract.id }, orderBy: { startDate: 'asc' }, select: { startDate: true, endDate: true, autoRenew: true } })

    assert.equal(created.filter(Boolean).length, 1)
    assert.equal(periods.length, 2)
    assert.deepEqual(periods[1], { startDate: new Date('2026-09-01T00:00:00.000Z'), endDate: new Date('2026-09-07T00:00:00.000Z'), autoRenew: true })
  } finally {
    await Promise.allSettled([
      ...(contractId ? [db.contract.delete({ where: { id: contractId } })] : []),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
      db.admin.delete({ where: { id: adminId } }),
    ])
    await db.$disconnect()
  }
})

test('future contract renewal helper fills the bounded horizon idempotently', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-renewal-horizon-${suffix}`
  const phone = `+1666${String(Date.now()).slice(-7)}`
  let customerId: string | undefined
  let contractId: string | undefined

  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Renewal Horizon Admin', role: 'SUPER_ADMIN' } })
    const customer = await db.customer.create({ data: { name: 'Renewal Horizon Customer', phone, address: 'Renewal Horizon Address', createdBy: adminId, autoOrdersEnabled: false } })
    customerId = customer.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: adminId, autoRenew: true, status: 'ENABLED', periods: { create: { startDate: new Date('2026-08-25T00:00:00.000Z'), endDate: new Date('2026-08-31T00:00:00.000Z'), status: 'ENABLED', autoRenew: true, enabledWeekdays: ['MONDAY'], disabledDates: [] } } } })
    contractId = contract.id

    const { ensureFutureContractPeriods } = await import('../src/lib/contracts/renewal-transaction')
    await Promise.all([ensureFutureContractPeriods(db, new Date('2026-09-30T00:00:00.000Z')), ensureFutureContractPeriods(db, new Date('2026-09-30T00:00:00.000Z'))])
    const periods = await db.contractPeriod.findMany({ where: { contractId: contract.id }, orderBy: { startDate: 'asc' }, select: { startDate: true, endDate: true } })

    assert.equal(periods.length, 6)
    assert.deepEqual(periods.map((period) => period.startDate), [
      new Date('2026-08-25T00:00:00.000Z'),
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-08T00:00:00.000Z'),
      new Date('2026-09-15T00:00:00.000Z'),
      new Date('2026-09-22T00:00:00.000Z'),
      new Date('2026-09-29T00:00:00.000Z'),
    ])
  } finally {
    await Promise.allSettled([
      ...(contractId ? [db.contract.delete({ where: { id: contractId } })] : []),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
      db.admin.delete({ where: { id: adminId } }),
    ])
    await db.$disconnect()
  }
})
