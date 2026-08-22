import test from 'node:test'
import assert from 'node:assert/strict'
import { getPublicErrorMessage } from '@/lib/public-error-message'

test('public error message keeps diagnostics outside production', () => {
  const environment = process.env as unknown as Record<string, string | undefined>
  const previous = environment.NODE_ENV
  environment.NODE_ENV = 'test'
  try {
    assert.equal(getPublicErrorMessage(new Error('database detail'), 'fallback'), 'database detail')
    assert.equal(getPublicErrorMessage('not an error', 'fallback'), 'fallback')
  } finally {
    environment.NODE_ENV = previous
  }
})

test('public error message hides diagnostics in production', () => {
  const environment = process.env as unknown as Record<string, string | undefined>
  const previous = environment.NODE_ENV
  environment.NODE_ENV = 'production'
  try {
    assert.equal(getPublicErrorMessage(new Error('database detail'), 'fallback'), 'fallback')
  } finally {
    environment.NODE_ENV = previous
  }
})
