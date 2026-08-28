import assert from 'node:assert/strict'
import test from 'node:test'
import { canSendToChatContact } from '../src/lib/chat/contact-lifecycle'

test('chat contact send policy protects System and blocks disabled contacts', () => {
  assert.equal(canSendToChatContact({ type: 'SYSTEM', state: 'ENABLED' }), false)
  assert.equal(canSendToChatContact({ type: 'ADMIN', state: 'DISABLED' }), false)
})

test('chat contact send policy keeps enabled and deleted history contacts available', () => {
  assert.equal(canSendToChatContact({ type: 'ADMIN', state: 'ENABLED' }), true)
  assert.equal(canSendToChatContact({ type: 'ADMIN', state: 'DELETED' }), true)
})
