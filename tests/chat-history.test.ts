import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMessageHistoryPage } from '../src/lib/chat/message-history'

const message = (id: string, createdAt: string) => ({ id, createdAt: new Date(createdAt) })

test('chat history returns a bounded oldest-first page with a cursor', () => {
  const page = buildMessageHistoryPage([
    message('newest', '2026-08-25T12:00:00.000Z'),
    message('middle', '2026-08-25T11:00:00.000Z'),
    message('oldest', '2026-08-25T10:00:00.000Z'),
  ], 2)
  assert.deepEqual(page.messages.map((item) => item.id), ['middle', 'newest'])
  assert.equal(page.hasMore, true)
  assert.equal(page.nextBefore, '2026-08-25T11:00:00.000Z')
})

test('chat history safely defaults invalid limits and reports an empty cursor', () => {
  const page = buildMessageHistoryPage([], 0)
  assert.deepEqual(page, { messages: [], hasMore: false, nextBefore: null })
})
