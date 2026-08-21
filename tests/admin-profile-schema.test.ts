import assert from 'node:assert/strict'
import test from 'node:test'
import { adminProfileUpdateSchema } from '../src/lib/admin/profile'

test('normalizes valid admin profile identity fields and preserves empty password compatibility', () => {
  const result = adminProfileUpdateSchema.safeParse({
    name: ' Admin ',
    email: ' admin@example.com ',
    password: '',
  })

  assert.equal(result.success, true)
  if (result.success) {
    assert.deepEqual(result.data, {
      name: 'Admin',
      email: 'admin@example.com',
      password: '',
    })
  }
})

test('rejects invalid profile identity and weak password values', () => {
  assert.equal(adminProfileUpdateSchema.safeParse({ name: '', email: 'admin@example.com' }).success, false)
  assert.equal(adminProfileUpdateSchema.safeParse({ name: 'Admin', email: 'not-an-email' }).success, false)
  assert.equal(adminProfileUpdateSchema.safeParse({ name: 'Admin', email: 'admin@example.com', password: 'short' }).success, false)
  assert.equal(adminProfileUpdateSchema.safeParse({ name: 'Admin', email: 'admin@example.com', password: 'x'.repeat(101) }).success, false)
})
