import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildClientCreateData,
  buildClientBulkUpdateData,
  buildClientUpdateData,
  clientBulkUpdateSchema,
  clientCreateSchema,
  clientIdSchema,
  clientUpdateSchema,
  safeClientSelect,
} from '../src/lib/admin/clients'

test('bounds dynamic client IDs', () => {
  assert.equal(clientIdSchema.safeParse('client-1').success, true)
  assert.equal(clientIdSchema.safeParse('  client-1  ').success, true)
  assert.equal(clientIdSchema.safeParse('').success, false)
  assert.equal(clientIdSchema.safeParse('x'.repeat(129)).success, false)
})

test('rejects empty and out-of-range client updates', () => {
  assert.equal(clientUpdateSchema.safeParse({}).success, false)
  assert.equal(clientUpdateSchema.safeParse({ calories: 499 }).success, false)
  assert.equal(clientUpdateSchema.safeParse({ latitude: 91 }).success, false)
  assert.equal(clientUpdateSchema.safeParse({ password: 'short' }).success, false)
  assert.equal(clientUpdateSchema.safeParse({ unknownField: 'ignored' }).success, false)
})

test('validates and maps bounded client create data', () => {
  const parsed = clientCreateSchema.parse({
    name: '  Ada  ',
    phone: '+998901112233',
    address: 'Tashkent',
    calories: '1600',
    deliveryDays: { monday: true },
    googleMapsLink: 'https://maps.google.com/?q=41.3,69.2',
  })

  assert.equal(parsed.name, 'Ada')
  assert.equal(parsed.calories, 1600)
  assert.equal(parsed.planType, 'CLASSIC')
  assert.deepEqual(buildClientCreateData(parsed, 'admin-id'), {
    name: 'Ada',
    nickName: '',
    phone: '+998901112233',
    address: 'Tashkent',
    preferences: '',
    orderPattern: JSON.stringify({ monday: true }),
    calories: 1600,
    planType: 'CLASSIC',
    dailyPrice: 84000,
    notes: '',
    deliveryDays: JSON.stringify({ monday: true }),
    autoOrdersEnabled: true,
    isActive: true,
    latitude: null,
    longitude: null,
    defaultCourierId: null,
    assignedSetId: null,
    createdBy: 'admin-id',
  })
})

test('rejects client create mass assignment and invalid phone', () => {
  assert.equal(clientCreateSchema.safeParse({ name: 'Ada', phone: '+123', address: 'x', role: 'SUPER_ADMIN' }).success, false)
  assert.equal(clientCreateSchema.safeParse({ name: 'Ada', phone: '+998901112233', address: 'x', password: 'secret' }).success, false)
})

test('validates and maps bounded bulk client updates', () => {
  const parsed = clientBulkUpdateSchema.parse({
    clientIds: [' client-1 ', 'client-2'],
    updates: { isActive: false, calories: '2400' },
  })

  assert.deepEqual(parsed.clientIds, ['client-1', 'client-2'])
  assert.deepEqual(buildClientBulkUpdateData(parsed.updates), {
    isActive: false,
    calories: 2400,
  })
  assert.equal(clientBulkUpdateSchema.safeParse({ clientIds: [], updates: { isActive: true } }).success, false)
  assert.equal(clientBulkUpdateSchema.safeParse({ clientIds: ['client-1'], updates: { password: 'secret' } }).success, false)
  assert.equal(clientBulkUpdateSchema.safeParse({ clientIds: Array.from({ length: 501 }, (_, index) => `client-${index}`), updates: { isActive: true } }).success, false)
})

test('normalizes and maps validated client updates without mass assignment', () => {
  const parsed = clientUpdateSchema.parse({
    name: '  Updated Client  ',
    calories: '2200',
    specialFeatures: 'No dairy',
    deliveryDays: { monday: true, friday: false },
    defaultCourierId: '',
    assignedSetId: null,
    latitude: 41.311,
    longitude: 69.279,
    password: 'new-password',
  })

  assert.deepEqual(buildClientUpdateData(parsed, 'hashed-password'), {
    name: 'Updated Client',
    calories: 2200,
    preferences: 'No dairy',
    orderPattern: JSON.stringify({ monday: true, friday: false }),
    deliveryDays: JSON.stringify({ monday: true, friday: false }),
    defaultCourierId: null,
    assignedSetId: null,
    latitude: 41.311,
    longitude: 69.279,
    password: 'hashed-password',
  })
  assert.equal('balance' in buildClientUpdateData(parsed, 'hashed-password'), false)
  assert.equal('createdBy' in buildClientUpdateData(parsed, 'hashed-password'), false)
})

test('does not add a password update when no usable password was supplied', () => {
  const parsed = clientUpdateSchema.parse({ name: 'Client' })
  const updateData = buildClientUpdateData(parsed)

  assert.deepEqual(updateData, { name: 'Client' })
  assert.equal('password' in updateData, false)
})

test('does not produce a database update for an empty password', () => {
  const parsed = clientUpdateSchema.parse({ password: '' })
  assert.deepEqual(buildClientUpdateData(parsed), {})
})

test('safe client projection excludes password and other secrets', () => {
  assert.equal('password' in safeClientSelect, false)
  assert.equal('id' in safeClientSelect, true)
  assert.equal('phone' in safeClientSelect, true)
})
