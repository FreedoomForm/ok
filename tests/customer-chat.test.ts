import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCustomerChatMessagePayload, CustomerThreadMessageView } from '../src/lib/customers/chat'

test('serializes a customer-authored message with a trimmed bounded content', () => {
  const payload = buildCustomerChatMessagePayload({ content: '  Здравствуйте, хочу изменить адрес доставки  ' })
  assert.deepEqual(payload, { content: 'Здравствуйте, хочу изменить адрес доставки' })
})

test('rejects empty and oversized customer chat content with typed errors', () => {
  assert.throws(
    () => buildCustomerChatMessagePayload({ content: '   ' }),
    (error: unknown) => error instanceof Error && error.message === 'EMPTY_CUSTOMER_CHAT_CONTENT',
  )
  assert.throws(
    () => buildCustomerChatMessagePayload({ content: 'x'.repeat(2001) }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CUSTOMER_CHAT_CONTENT',
  )
  const maxed = buildCustomerChatMessagePayload({ content: 'x'.repeat(2000) })
  assert.equal(maxed.content.length, 2000)
})

test('normalizes thread rows into customer-side views with the administrator last', () => {
  const rows = [
    { id: 'm1', content: 'Добрый день!', createdAt: new Date('2026-08-29T08:00:00.000Z'), author: 'ADMIN' as const, senderName: 'Anna Admin' },
    { id: 'm2', content: 'Здравствуйте!', createdAt: new Date('2026-08-29T08:05:00.000Z'), author: 'CUSTOMER' as const, senderName: null },
  ]
  const view = rows.map((row) => CustomerThreadMessageView.fromRow(row))
  assert.deepEqual(view, [
    { id: 'm1', content: 'Добрый день!', author: 'ADMIN', senderName: 'Anna Admin', createdAt: '2026-08-29T08:00:00.000Z' },
    { id: 'm2', content: 'Здравствуйте!', author: 'CUSTOMER', senderName: null, createdAt: '2026-08-29T08:05:00.000Z' },
  ])
})
