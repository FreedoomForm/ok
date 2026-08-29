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

    const renewLogs = await db.actionLog.findMany({ where: { action: 'RENEW_CONTRACT_PERIOD', entityId: contract.id } })
    assert.equal(renewLogs.length, 1)
    assert.equal(renewLogs[0].adminId, adminId)
    assert.equal(renewLogs[0].entityType, 'CONTRACT')
    const details = JSON.parse(renewLogs[0].details ?? '{}')
    assert.deepEqual(details, {
      result: 'CREATED',
      source: 'SCHEDULER',
      dateRange: { start: '2026-09-01', end: '2026-09-07' },
      correlationKey: `renewal:${contract.id}:2026-09-01:2026-09-07`,
    })
  } finally {
    await Promise.allSettled([
      db.actionLog.deleteMany({ where: { OR: [{ adminId }, { entityId: contractId ?? '' }] } }),
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

    const renewLogs = await db.actionLog.findMany({ where: { action: 'RENEW_CONTRACT_PERIOD', entityId: contract.id }, orderBy: { createdAt: 'asc' } })
    assert.equal(renewLogs.length, 5)
    const parsedDetails = renewLogs.map((log) => JSON.parse(log.details ?? '{}'))
    assert.deepEqual(parsedDetails.map((details) => details.result), Array.from({ length: 5 }, () => 'CREATED'))
    assert.deepEqual(parsedDetails.map((details) => details.source), Array.from({ length: 5 }, () => 'SCHEDULER'))
    assert.deepEqual(parsedDetails.map((details) => details.dateRange), [
      { start: '2026-09-01', end: '2026-09-07' },
      { start: '2026-09-08', end: '2026-09-14' },
      { start: '2026-09-15', end: '2026-09-21' },
      { start: '2026-09-22', end: '2026-09-28' },
      { start: '2026-09-29', end: '2026-10-05' },
    ])
    assert.deepEqual(new Set(parsedDetails.map((details) => details.correlationKey)).size, 5)
  } finally {
    await Promise.allSettled([
      db.actionLog.deleteMany({ where: { OR: [{ adminId }, { entityId: contractId ?? '' }] } }),
      ...(contractId ? [db.contract.delete({ where: { id: contractId } })] : []),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
      db.admin.delete({ where: { id: adminId } }),
    ])
    await db.$disconnect()
  }
})

test('manual renewal core writes a scoped MANUAL audit row and replays idempotently', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-renewal-manual-${suffix}`
  const phone = `+1777${String(Date.now()).slice(-7)}`
  let customerId: string | undefined
  let contractId: string | undefined

  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Manual Renewal Admin', role: 'SUPER_ADMIN' } })
    const customer = await db.customer.create({ data: { name: 'Manual Renewal Customer', phone, address: 'Manual Renewal Address', createdBy: adminId, autoOrdersEnabled: false } })
    customerId = customer.id
    const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: adminId, autoRenew: true, status: 'ENABLED', periods: { create: { startDate: new Date('2026-08-25T00:00:00.000Z'), endDate: new Date('2026-08-31T00:00:00.000Z'), status: 'ENABLED', autoRenew: true, enabledWeekdays: ['MONDAY'], disabledDates: [] } } } })
    contractId = contract.id

    const { renewContractPeriodManually } = await import('../src/lib/contracts/renewal-manual')

    const outOfScope = await renewContractPeriodManually(db, { contractId: contract.id, actorAdminId: adminId, groupAdminIds: [`other-admin-${suffix}`] })
    assert.equal(outOfScope.kind, 'NOT_FOUND')

    const first = await renewContractPeriodManually(db, { contractId: contract.id, actorAdminId: adminId, groupAdminIds: null, correlationKey: 'manual-renew-key-0001' })
    assert.equal(first.kind, 'CREATED')

    const second = await renewContractPeriodManually(db, { contractId: contract.id, actorAdminId: adminId, groupAdminIds: null, correlationKey: 'manual-renew-key-0002' })
    assert.equal(second.kind, 'CREATED')

    // Deterministic concurrent-renewal replay: a competing actor commits the
    // same computed period between the manual core's contract read and its
    // existing-period check, forcing the idempotent ALREADY_EXISTS outcome.
    const competing = db.contractPeriod.create({ data: { contractId: contract.id, courierId: null, startDate: new Date('2026-09-15T00:00:00.000Z'), endDate: new Date('2026-09-21T00:00:00.000Z'), status: 'ENABLED', paid: false, autoRenew: true, enabledWeekdays: ['MONDAY'], disabledDates: [] } })
    const interceptorDb = db.$extends({
      query: {
        contractPeriod: {
          findFirst: async ({ args, query }) => {
            await competing
            return query(args)
          },
        },
      },
    }) as unknown as import('@prisma/client').PrismaClient
    const replay = await renewContractPeriodManually(interceptorDb, { contractId: contract.id, actorAdminId: adminId, groupAdminIds: null, correlationKey: 'manual-renew-key-0003' })
    const replayed = await competing
    assert.equal(replay.kind, 'ALREADY_EXISTS')
    assert.equal('period' in replay && replay.period.id, replayed.id)

    const logs = await db.actionLog.findMany({ where: { action: 'RENEW_CONTRACT_PERIOD', entityId: contract.id }, orderBy: { createdAt: 'asc' } })
    assert.equal(logs.length, 2)
    const parsedLogs = logs.map((log) => JSON.parse(log.details ?? '{}'))
    assert.deepEqual(parsedLogs, [
      {
        result: 'CREATED',
        source: 'MANUAL',
        dateRange: { start: '2026-09-01', end: '2026-09-07' },
        correlationKey: 'manual-renew-key-0001',
      },
      {
        result: 'CREATED',
        source: 'MANUAL',
        dateRange: { start: '2026-09-08', end: '2026-09-14' },
        correlationKey: 'manual-renew-key-0002',
      },
    ])
  } finally {
    await Promise.allSettled([
      db.actionLog.deleteMany({ where: { OR: [{ adminId }, { entityId: contractId ?? '' }] } }),
      ...(contractId ? [db.contract.delete({ where: { id: contractId } })] : []),
      ...(customerId ? [db.customer.delete({ where: { id: customerId } })] : []),
      db.admin.delete({ where: { id: adminId } }),
    ])
    await db.$disconnect()
  }
})
