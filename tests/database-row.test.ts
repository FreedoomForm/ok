import assert from 'node:assert/strict'
import test from 'node:test'

import type { PrismaClient } from '@prisma/client'

import type { DatabaseTableId } from '../src/lib/admin/database-row'
import { createDatabaseRow, updateDatabaseRow } from '../src/lib/admin/database-row-write'

import {
  coerceDatabaseValue,
  parseDatabaseRowRequest,
} from '../src/lib/admin/database-row'

test('coerces supported database row scalar values', () => {
  assert.equal(coerceDatabaseValue('true'), true)
  assert.equal(coerceDatabaseValue('42'), 42)
  assert.equal(coerceDatabaseValue(''), undefined)
  assert.equal(coerceDatabaseValue('plain text'), 'plain text')
  assert.ok(coerceDatabaseValue('2026-08-21') instanceof Date)
})

test('accepts allowlisted create row payloads and strips id', () => {
  const result = parseDatabaseRowRequest(
    { tableId: 'customers', data: { id: 'client-id', name: 'Ada', calories: '1600' } },
    { requireId: false },
  )

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.value.data, { name: 'Ada', calories: 1600 })
    assert.equal(result.value.id, undefined)
  }
})

test('accepts update row payloads only with a bounded id', () => {
  const result = parseDatabaseRowRequest(
    { tableId: 'orders', id: 'order-id', data: { orderStatus: 'DELIVERED' } },
    { requireId: true },
  )

  assert.deepEqual(result, {
    ok: true,
    value: { tableId: 'orders', id: 'order-id', data: { orderStatus: 'DELIVERED' } },
  })
})

test('rejects unknown tables, invalid ids, and missing data', () => {
  assert.equal(parseDatabaseRowRequest({ tableId: 'users', data: {} }, { requireId: false }).ok, false)
  assert.equal(parseDatabaseRowRequest({ tableId: 'orders', data: {} }, { requireId: true }).ok, false)
  assert.equal(parseDatabaseRowRequest({ tableId: 'orders', id: 'x', data: null }, { requireId: true }).ok, false)
})

test('rejects nested values and unsafe field names', () => {
  const nested = parseDatabaseRowRequest(
    { tableId: 'customers', data: { preferences: { admin: true } } },
    { requireId: false },
  )
  const unsafe = parseDatabaseRowRequest(
    { tableId: 'customers', data: { 'name;DROP TABLE customers': 'x' } },
    { requireId: false },
  )

  assert.equal(nested.ok, false)
  assert.equal(unsafe.ok, false)
})

test('fails explicitly if a runtime table id bypasses the parser', async () => {
  const db = {} as PrismaClient
  const invalidTableId = 'users' as DatabaseTableId

  await assert.rejects(
    createDatabaseRow(db, invalidTableId, {}),
    /Unsupported database table: users/,
  )
  await assert.rejects(
    updateDatabaseRow(db, invalidTableId, 'row-id', {}),
    /Unsupported database table: users/,
  )
})

test('rejects oversized row shapes and values', () => {
  const manyFields = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`field${index}`, 'x']))
  const longValue = 'x'.repeat(10_001)

  assert.equal(parseDatabaseRowRequest({ tableId: 'customers', data: manyFields }, { requireId: false }).ok, false)
  assert.equal(parseDatabaseRowRequest({ tableId: 'customers', data: { name: longValue } }, { requireId: false }).ok, false)
})
