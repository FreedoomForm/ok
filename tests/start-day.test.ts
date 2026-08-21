import assert from 'node:assert/strict'
import test from 'node:test'
import { parseStartDayDate } from '../src/lib/admin/start-day'

const now = new Date('2026-08-21T12:00:00.000Z')

test('accepts only the current UTC calendar day', () => {
  const result = parseStartDayDate({ date: '2026-08-21' }, now)
  assert.equal('error' in result, false)
  if (!('error' in result)) {
    assert.equal(result.start.toISOString(), '2026-08-21T00:00:00.000Z')
    assert.equal(result.end.toISOString(), '2026-08-21T23:59:59.999Z')
  }
})

test('rejects malformed, impossible and non-today dates', () => {
  assert.match(parseStartDayDate({ date: '2026-02-30' }, now).error || '', /календарная/)
  assert.match(parseStartDayDate({ date: '2026-08-21T00:00:00.000Z' }, now).error || '', /формат/)
  assert.match(parseStartDayDate({ date: '2026-08-20' }, now).error || '', /сегодня/)
  assert.match(parseStartDayDate(null, now).error || '', /Invalid payload|Invalid input|формат/)
})
