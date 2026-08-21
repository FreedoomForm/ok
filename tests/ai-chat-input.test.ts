import assert from 'node:assert/strict'
import test from 'node:test'
import { aiChatRequestSchema } from '../src/lib/ai/chat-input'

test('accepts bounded AI chat requests and trims fields', () => {
  const result = aiChatRequestSchema.safeParse({
    message: '  hello  ',
    websiteId: ' site-1 ',
    history: [{ role: 'user', content: ' previous ' }],
  })

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.message, 'hello')
    assert.equal(result.data.websiteId, 'site-1')
    assert.equal(result.data.history?.[0]?.content, 'previous')
  }
})

test('rejects malformed, oversized, and unsupported AI chat input', () => {
  assert.equal(aiChatRequestSchema.safeParse({ message: '' }).success, false)
  assert.equal(aiChatRequestSchema.safeParse({ message: 'x', history: [{ role: 'system', content: 'x' }] }).success, false)
  assert.equal(aiChatRequestSchema.safeParse({ message: 'x'.repeat(4001) }).success, false)
  assert.equal(aiChatRequestSchema.safeParse({ message: 'x', history: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) }).success, false)
})
