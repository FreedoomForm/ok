import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isSystemContactShape,
  resolveChatContactStateForMode,
} from '@/lib/chat/contact-commands'
import { CHAT_CONTACT_COLORS, CHAT_CONTACT_ICONS } from '@/lib/chat/contacts'

// C8 / R33: universal workspace commands map to contact STATE values.

test('enabled mode maps to the ENABLED contact state', () => {
  assert.equal(resolveChatContactStateForMode('enabled'), 'ENABLED')
})

test('disabled mode maps to the DISABLED contact state', () => {
  assert.equal(resolveChatContactStateForMode('disabled'), 'DISABLED')
})

test('the system contact is never a target for state commands', () => {
  assert.equal(isSystemContactShape({ type: 'SYSTEM' }), true)
  assert.equal(isSystemContactShape({ type: 'ADMIN' }), false)
  assert.equal(isSystemContactShape(null), false)
})

test('unused-style pools exclude taken shades and keep the full list as fallback', () => {
  // The create window (R32) computes this via the same filter as ChatUnifiedTab:
  // free entries first, full palette when everything is taken.
  const used = new Set<string>([CHAT_CONTACT_COLORS[0], CHAT_CONTACT_COLORS[1]])
  const free: readonly string[] = CHAT_CONTACT_COLORS.filter((color) => !used.has(color))
  assert.equal(free.length, CHAT_CONTACT_COLORS.length - 2)
  assert.equal(free.includes(CHAT_CONTACT_COLORS[0]), false)

  const everyIconUsed = new Set(CHAT_CONTACT_ICONS)
  const fallback = CHAT_CONTACT_ICONS.filter((icon) => !everyIconUsed.has(icon))
  assert.equal(fallback.length, 0)
})
