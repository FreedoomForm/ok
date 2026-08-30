import assert from 'node:assert/strict'
import test from 'node:test'

import { formatOverrideSource } from '../src/lib/resources/availability'

const RU = { enabled: 'Включен', disabled: 'Отключен', source: 'Источник' }

// Addendum §5: the resource calendar must surface the source of every explicit
// enabled/disabled day override alongside its state color.

test('override source formats the persisted reason with the state label', () => {
  assert.equal(
    formatOverrideSource('DISABLED', 'Universal workspace command', RU),
    'Отключен · Источник: Universal workspace command',
  )
  assert.equal(
    formatOverrideSource('ENABLED', 'Восстановлено администратором', RU),
    'Включен · Источник: Восстановлено администратором',
  )
})

test('override source falls back to the plain state label without a reason', () => {
  assert.equal(formatOverrideSource('DISABLED', null, RU), 'Отключен')
  assert.equal(formatOverrideSource('ENABLED', undefined, RU), 'Включен')
  assert.equal(formatOverrideSource('DISABLED', '   ', RU), 'Отключен')
})
