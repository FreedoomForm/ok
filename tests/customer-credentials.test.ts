import assert from 'node:assert/strict'
import test from 'node:test'
import bcrypt from 'bcryptjs'

import { normalizeCustomerPhone } from '@/lib/customer-phone'

test('normalizes the admin-created client login phone consistently', () => {
  assert.equal(normalizeCustomerPhone(' +998 (90) 123-45-67 '), '+998901234567')
  assert.equal(normalizeCustomerPhone(''), '')
})

test('initial client password is verifiable only through its hash', async () => {
  const phone = normalizeCustomerPhone('90 123 45 67')
  const hashed = await bcrypt.hash(phone, 10)
  assert.notEqual(hashed, phone)
  assert.equal(await bcrypt.compare(phone, hashed), true)
  assert.equal(await bcrypt.compare('+998901234568', hashed), false)
})
