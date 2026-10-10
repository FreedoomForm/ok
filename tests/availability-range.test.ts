import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAvailabilityRangeDates,
  chunkAvailabilityBatches,
  filterResourcesByAvailabilityState,
} from '../src/lib/contracts/availability-range'

type Row = { id: string; state: 'ENABLED' | 'DISABLED' }

const rows: Row[] = [
  { id: 'a', state: 'ENABLED' },
  { id: 'b', state: 'DISABLED' },
  { id: 'c', state: 'ENABLED' },
]

test('R14: the availability range is an inclusive per-day ISO list', () => {
  const dates = buildAvailabilityRangeDates(new Date(2026, 9, 8), new Date(2026, 9, 12))
  assert.deepEqual(dates, ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'])

  // A single day yields exactly one entry; an inverted range yields none.
  assert.deepEqual(buildAvailabilityRangeDates(new Date(2026, 9, 8), new Date(2026, 9, 8)), ['2026-10-08'])
  assert.deepEqual(buildAvailabilityRangeDates(new Date(2026, 9, 12), new Date(2026, 9, 8)), [])
})

test('R14: bulk application chunks the payload within the 500 cap', () => {
  const ids = Array.from({ length: 1201 }, (_, index) => `id-${index}`)
  const batches = chunkAvailabilityBatches(ids)
  assert.equal(batches.length, 3)
  assert.ok(batches[0].length <= 500)
  assert.ok(batches[1].length <= 500)
  assert.equal(batches[2].length, 201)
  assert.deepEqual(batches.flat(), ids)

  assert.deepEqual(chunkAvailabilityBatches(['a'], 500), [['a']])
  assert.deepEqual(chunkAvailabilityBatches([], 500), [])
})

test('R15: enabled/disabled modes narrow lists to the matching availability state', () => {
  assert.deepEqual(
    filterResourcesByAvailabilityState(rows, 'enabled', (row) => row.state).map((row) => row.id),
    ['a', 'c'],
  )
  assert.deepEqual(
    filterResourcesByAvailabilityState(rows, 'disabled', (row) => row.state).map((row) => row.id),
    ['b'],
  )
  // Outside the modes the list passes through untouched (copy).
  const passthrough = filterResourcesByAvailabilityState(rows, null, (row) => row.state)
  assert.deepEqual(passthrough, rows)
  assert.notEqual(passthrough, rows)
})
