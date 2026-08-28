import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCustomerProfileUpdateData,
  customerProfilePatchSchema,
  InvalidCustomerProfileLocationError,
  toCustomerProfileResponse,
} from '../src/lib/customer-profile'

test('normalizes supported customer profile fields without widening the update surface', () => {
  const parsed = customerProfilePatchSchema.parse({
    name: '  Browser Customer  ',
    address: '  Tashkent  ',
    preferences: 'No dairy',
    calories: '2200',
    deliveryDays: { monday: true, friday: false },
  })

  assert.deepEqual(parsed, {
    name: 'Browser Customer',
    address: 'Tashkent',
    preferences: 'No dairy',
    calories: 2200,
    deliveryDays: { monday: true, friday: false },
  })
  assert.deepEqual(buildCustomerProfileUpdateData(parsed), {
    data: {
      name: 'Browser Customer',
      address: 'Tashkent',
      preferences: 'No dairy',
      calories: 2200,
      deliveryDays: JSON.stringify({ monday: true, friday: false }),
    },
    coordinates: null,
  })
})

test('accepts trusted coordinates and uses them as the fallback address', () => {
  const parsed = customerProfilePatchSchema.parse({ googleMapsLink: 'https://maps.google.com/?q=41.311081,69.240562' })
  assert.deepEqual(buildCustomerProfileUpdateData(parsed), {
    data: {
      address: 'https://maps.google.com/?q=41.311081,69.240562',
      latitude: 41.311081,
      longitude: 69.240562,
    },
    coordinates: { lat: 41.311081, lng: 69.240562 },
  })
})

test('rejects mass assignment and unsafe profile values', () => {
  assert.equal(customerProfilePatchSchema.safeParse({ balance: 100000 }).success, false)
  assert.equal(customerProfilePatchSchema.safeParse({ password: 'new-password' }).success, false)
  assert.equal(customerProfilePatchSchema.safeParse({ calories: 'not-a-number' }).success, false)
  assert.equal(customerProfilePatchSchema.safeParse({ calories: 10001 }).success, false)
  assert.equal(customerProfilePatchSchema.safeParse({ name: 'x'.repeat(256) }).success, false)
  assert.equal(customerProfilePatchSchema.safeParse({ deliveryDays: { monday: true, holiday: true } }).success, false)
})

test('rejects invalid map coordinates through the module interface', () => {
  const parsed = customerProfilePatchSchema.parse({ googleMapsLink: 'https://example.com/not-a-map' })
  assert.throws(() => buildCustomerProfileUpdateData(parsed), InvalidCustomerProfileLocationError)
})

test('does not expose customer secrets in the profile response projection', () => {
  const response = toCustomerProfileResponse({
    id: 'customer-1',
    name: 'Customer',
    phone: '+998901112233',
    password: 'hashed-password',
    createdBy: 'admin-1',
    deletedAt: null,
    deletedBy: null,
    balance: 0,
  })

  assert.deepEqual(response, {
    id: 'customer-1',
    name: 'Customer',
    phone: '+998901112233',
    balance: 0,
  })
  assert.equal('password' in response, false)
  assert.equal('createdBy' in response, false)
})
