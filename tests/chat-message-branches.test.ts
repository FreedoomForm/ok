import assert from 'node:assert/strict'
import test from 'node:test'
import { sendMessageSchema } from '../src/lib/chat/messages'

test('chat message payload accepts an optional reply branch pointer', () => {
  const parsed = sendMessageSchema.safeParse({ conversationId: 'conversation-1', content: 'Follow-up', replyToMessageId: 'message-1' })
  assert.equal(parsed.success, true)
  if (parsed.success) assert.equal(parsed.data.replyToMessageId, 'message-1')
})

test('chat message payload rejects unsafe branch payloads', () => {
  assert.equal(sendMessageSchema.safeParse({ conversationId: 'conversation-1', content: 'x'.repeat(5001) }).success, false)
  assert.equal(sendMessageSchema.safeParse({ conversationId: 'conversation-1', content: 'hello', replyToMessageId: '' }).success, false)
  assert.equal(sendMessageSchema.safeParse({ conversationId: 'conversation-1', content: 'hello', branch: 'other' }).success, false)
})
