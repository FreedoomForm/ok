import assert from 'node:assert/strict'
import test from 'node:test'

import {
  asNonEmptyString,
  buildRowData,
  coerceImportValue,
  toStringCell,
} from '../src/lib/admin/database-import-row'

test('normalizes import cells without changing valid scalar semantics', () => {
  assert.equal(asNonEmptyString('  client-id  '), 'client-id')
  assert.equal(asNonEmptyString('  '), null)
  assert.equal(coerceImportValue(' true '), true)
  assert.equal(coerceImportValue('42'), 42)
  assert.deepEqual(coerceImportValue('{"enabled":true}'), { enabled: true })
  assert.ok(coerceImportValue('2026-08-21') instanceof Date)
  assert.equal(coerceImportValue('not-json{'), 'not-json{')
})

test('serializes workbook values and omits managed row metadata', () => {
  assert.equal(toStringCell(null), '')
  assert.equal(toStringCell(42), '42')
  assert.equal(toStringCell({ enabled: true }), '{"enabled":true}')
  assert.deepEqual(
    buildRowData({ id: 'row-id', createdAt: '2026-08-21', name: ' Ada ', calories: '1600' }),
    { name: ' Ada ', calories: 1600 },
  )
})
