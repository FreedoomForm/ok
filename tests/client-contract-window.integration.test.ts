import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'

import { buildClientContractWeekdays, createContractWindowForClient } from '../src/lib/admin/clients'
import { buildCourierDayListNotification, createCourierDayListNotification, courierDayListSystemCode } from '../src/lib/chat/notifications'

// C6 integration gate: client save → contract period → courier notification.

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('contract window creates contract + period + audit inside the client transaction', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-c6-${suffix}`
  let customerId: string | undefined
  let contractId: string | undefined
  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'C6 Integration Admin', role: 'SUPER_ADMIN' } })
    const created = await db.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { name: 'C6 Window Customer', phone: `+1556${String(Date.now()).slice(-7)}`, address: 'C6 Address', createdBy: adminId, deliveryDays: JSON.stringify({ monday: true, tuesday: true }), autoOrdersEnabled: true } })
      customerId = customer.id
      return createContractWindowForClient(tx, {
        customerId: customer.id,
        ownerAdminId: adminId,
        actorAdminId: adminId,
        courierId: null,
        paid: true,
        startDate: '2026-10-05',
        endDate: '2026-10-11',
        enabledWeekdays: buildClientContractWeekdays({ monday: true, tuesday: true }),
      })
    })
    contractId = created.id
    assert.ok(created.periods[0]?.id)

    const contract = await db.contract.findUnique({ where: { id: created.id }, include: { periods: true } })
    assert.ok(contract)
    assert.equal(contract.status, 'ENABLED')
    assert.equal(contract.autoRenew, true)
    assert.equal(contract.paid, true)
    assert.equal(contract.periods.length, 1)
    assert.equal(contract.periods[0].status, 'ENABLED')
    assert.deepEqual(contract.periods[0].enabledWeekdays, ['MONDAY', 'TUESDAY'])

    const logs = await db.actionLog.findMany({ where: { action: 'CREATE_CONTRACT', entityId: created.id } })
    assert.equal(logs.length, 1)
    assert.equal(logs[0].adminId, adminId)
  } finally {
    if (contractId) await db.contract.delete({ where: { id: contractId } }).catch(() => undefined)
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined)
    await db.admin.delete({ where: { id: adminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})

test('courier day-list notification is idempotent per (courier, date)', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-c6-daylist-${suffix}`
  const courierId = `integration-c6-courier-${suffix}`
  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'C6 DayList Admin', role: 'SUPER_ADMIN' } })
    await db.admin.create({ data: { id: courierId, email: `${courierId}@example.test`, name: 'C6 DayList Courier', role: 'COURIER', createdBy: adminId } })
    const dateKey = '2026-10-11'
    const content = buildCourierDayListNotification({
      courierName: 'C6 DayList Courier',
      date: dateKey,
      rows: [{ orderNumber: 42, customerName: 'C6 Client', address: 'C6 Street', deliveryTime: '12:00' }],
    })
    const first = await createCourierDayListNotification(db, { actorAdminId: adminId, courierId, dateKey, content })
    const second = await createCourierDayListNotification(db, { actorAdminId: adminId, courierId, dateKey, content })
    assert.ok(first)
    assert.equal(second, null)

    const messages = await db.message.findMany({
      where: { systemCode: courierDayListSystemCode(dateKey), conversation: { participant1Id: [adminId, courierId].sort()[0], participant2Id: [adminId, courierId].sort()[1] } },
    })
    assert.equal(messages.length, 1)
    assert.equal(messages[0].messageType, 'SYSTEM')
    assert.match(messages[0].content, /#42 — C6 Client, C6 Street, 12:00/)
  } finally {
    await db.message.deleteMany({ where: { conversation: { participant1Id: [adminId, courierId].sort()[0], participant2Id: [adminId, courierId].sort()[1] } } }).catch(() => undefined)
    await db.conversation.deleteMany({ where: { participant1Id: [adminId, courierId].sort()[0], participant2Id: [adminId, courierId].sort()[1] } }).catch(() => undefined)
    await db.admin.delete({ where: { id: courierId } }).catch(() => undefined)
    await db.admin.delete({ where: { id: adminId } }).catch(() => undefined)
    await db.$disconnect()
  }
})
