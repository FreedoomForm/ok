import assert from 'node:assert/strict'
import test from 'node:test'
import { canStartConversation, type ChatParticipant } from '../src/lib/chat/participants'

const participant = (overrides: Partial<ChatParticipant> = {}): ChatParticipant => ({
  id: 'user-1',
  role: 'LOW_ADMIN',
  createdBy: 'middle-1',
  isActive: true,
  ...overrides,
})

test('allows the role relationships exposed by the chat user picker', () => {
  assert.equal(canStartConversation(participant({ id: 'middle-1', role: 'MIDDLE_ADMIN', createdBy: null }), participant({ id: 'courier-1', role: 'COURIER', createdBy: 'middle-1' })), true)
  assert.equal(canStartConversation(participant({ id: 'low-1', role: 'LOW_ADMIN' }), participant({ id: 'super-1', role: 'SUPER_ADMIN', createdBy: null })), true)
  assert.equal(canStartConversation(participant({ id: 'super-1', role: 'SUPER_ADMIN', createdBy: null }), participant({ id: 'middle-1', role: 'MIDDLE_ADMIN', createdBy: null })), true)
})

test('rejects cross-group, same-user, inactive, and unsupported relationships', () => {
  assert.equal(canStartConversation(participant({ id: 'low-1' }), participant({ id: 'peer-2', role: 'LOW_ADMIN', createdBy: 'middle-2' })), false)
  assert.equal(canStartConversation(participant(), participant()), false)
  assert.equal(canStartConversation(participant(), participant({ id: 'inactive', isActive: false })), false)
  assert.equal(canStartConversation(participant({ id: 'super-1', role: 'SUPER_ADMIN', createdBy: null }), participant({ id: 'super-2', role: 'SUPER_ADMIN', createdBy: null })), false)
})
