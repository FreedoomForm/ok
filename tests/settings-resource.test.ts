import assert from 'node:assert/strict'
import test from 'node:test'
import { adminSettingsPatchSchema, mergeAdminSettings } from '../src/lib/admin/settings'

test('settings patch accepts bounded interface preferences and preserves defaults', () => {
  const current = mergeAdminSettings(null)
  const updated = mergeAdminSettings({ ...current, theme: 'dark', compactMode: true })

  assert.deepEqual(current, { compactMode: false, showStats: true, enableAnimations: true, theme: 'light' })
  assert.deepEqual(updated, { compactMode: true, showStats: true, enableAnimations: true, theme: 'dark' })
})

test('settings patch rejects unknown fields and invalid theme values', () => {
  assert.equal(adminSettingsPatchSchema.safeParse({ theme: 'neon' }).success, false)
  assert.equal(adminSettingsPatchSchema.safeParse({ unknown: true }).success, false)
  assert.equal(adminSettingsPatchSchema.safeParse({ compactMode: true, showStats: false, enableAnimations: true, theme: 'system' }).success, true)
})

test('settings merge ignores malformed persisted values', () => {
  assert.deepEqual(mergeAdminSettings({ compactMode: 'yes', showStats: 1, enableAnimations: null, theme: 'dark' }), { compactMode: false, showStats: true, enableAnimations: true, theme: 'dark' })
})
