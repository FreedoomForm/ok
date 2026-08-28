import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAdminContract,
  buildScopedAdminWhere,
  buildClientContract,
  buildOrderContract,
  isResourceDetailEntity,
  sortTransactionsByCreatedAt,
  isValidResourceDate,
  filterOrdersForEffectiveDate,
} from '../src/lib/admin/resource-details'

test('accepts only supported resource detail entities', () => {
  assert.equal(isResourceDetailEntity('order'), true)
  assert.equal(isResourceDetailEntity('client'), true)
  assert.equal(isResourceDetailEntity('admin'), true)
  assert.equal(isResourceDetailEntity('transaction'), true)
  assert.equal(isResourceDetailEntity('contract'), true)
  assert.equal(isResourceDetailEntity(null), false)
})

test('derives an order contract from operational order fields', () => {
  const createdAt = new Date('2026-08-01T08:00:00.000Z')
  const deliveredAt = new Date('2026-08-01T12:00:00.000Z')
  assert.deepEqual(buildOrderContract({
    id: 'order-1',
    orderNumber: 42,
    orderStatus: 'DELIVERED',
    createdAt,
    deliveredAt,
    canceledAt: null,
    failedAt: null,
    quantity: 2,
    calories: 1800,
    deliveryDate: new Date('2026-08-02T00:00:00.000Z'),
    deliveryTime: '12:00-14:00',
    paymentStatus: 'PAID',
    paymentMethod: 'CARD',
  }), {
    id: 'order-1',
    type: 'ORDER',
    title: 'Order #42',
    status: 'DELIVERED',
    startedAt: createdAt,
    endsAt: deliveredAt,
    terms: {
      quantity: 2,
      calories: 1800,
      deliveryDate: new Date('2026-08-02T00:00:00.000Z'),
      deliveryTime: '12:00-14:00',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
    },
  })
})

test('derives client delivery plan and admin employment contracts', () => {
  const createdAt = new Date('2026-08-01T08:00:00.000Z')
  assert.deepEqual(buildClientContract({
    id: 'client-1',
    createdAt,
    deletedAt: null,
    assignedSet: { id: 'set-1', name: 'Classic set' },
    planType: 'CLASSIC',
    isActive: true,
    dailyPrice: 84000,
    calories: 2000,
    deliveryDays: '1,3,5',
    autoOrdersEnabled: true,
  }), {
    id: 'client-1',
    type: 'DELIVERY_PLAN',
    title: 'Classic set',
    status: 'ACTIVE',
    startedAt: createdAt,
    endsAt: null,
    terms: {
      dailyPrice: 84000,
      calories: 2000,
      deliveryDays: '1,3,5',
      autoOrdersEnabled: true,
      assignedSet: { id: 'set-1', name: 'Classic set' },
    },
  })

  assert.deepEqual(buildAdminContract({
    id: 'admin-1',
    createdAt,
    role: 'LOW_ADMIN',
    isActive: false,
    salary: 2500000,
    transportType: 'CAR',
    vehicleNumber: '01A001AA',
  }), {
    id: 'admin-1',
    type: 'EMPLOYMENT',
    title: 'LOW_ADMIN',
    status: 'INACTIVE',
    startedAt: createdAt,
    endsAt: null,
    terms: {
      salary: 2500000,
      transportType: 'CAR',
      vehicleNumber: '01A001AA',
    },
  })
})

test('keeps the requested admin id inside the allowed group scope', () => {
  assert.deepEqual(buildScopedAdminWhere('admin-2', ['admin-1', 'admin-2']), {
    id: { equals: 'admin-2', in: ['admin-1', 'admin-2'] },
  })
  assert.deepEqual(buildScopedAdminWhere('admin-2', null), { id: 'admin-2' })
})

test('validates bounded resource detail dates and filters effective orders', () => {
  assert.equal(isValidResourceDate('2026-08-25'), true)
  assert.equal(isValidResourceDate('2026-02-30'), false)
  const rows = [
    { id: 'enabled', deliveryDate: new Date('2026-08-25T00:00:00.000Z') },
    { id: 'other-day', deliveryDate: new Date('2026-08-26T00:00:00.000Z') },
    { id: 'missing', deliveryDate: null },
  ]
  assert.deepEqual(filterOrdersForEffectiveDate(rows, '2026-08-25', false).map((row) => row.id), ['enabled'])
  assert.deepEqual(filterOrdersForEffectiveDate(rows, '2026-08-25', true), [])
})

test('sorts transaction views newest-first without mutating the source', () => {
  const older = { id: 'old', createdAt: new Date('2026-08-01T08:00:00.000Z') }
  const newer = { id: 'new', createdAt: new Date('2026-08-02T08:00:00.000Z') }
  const source = [older, newer]
  assert.deepEqual(sortTransactionsByCreatedAt(source).map((row) => row.id), ['new', 'old'])
  assert.deepEqual(source.map((row) => row.id), ['old', 'new'])
})
