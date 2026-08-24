import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CHAT_CONTACT_COLORS,
  CHAT_CONTACT_ICONS,
  normalizeContactPhone,
  selectContactStyle,
} from '@/lib/chat/contacts'

test('normalizes contact phone consistently for login and duplicate checks', () => {
  assert.equal(normalizeContactPhone(' +998 (90) 123-45-67 '), '+998901234567')
  assert.equal(normalizeContactPhone('90 123 45 67'), '901234567')
})

test('selects an unused contact color and professional icon deterministically', () => {
  const style = selectContactStyle(
    [{ color: CHAT_CONTACT_COLORS[0], icon: CHAT_CONTACT_ICONS[0] }],
  )
  assert.equal(style.color, CHAT_CONTACT_COLORS[1])
  assert.equal(style.icon, CHAT_CONTACT_ICONS[1])
})

test('wraps style selection when every style is already used', () => {
  const style = selectContactStyle(
    CHAT_CONTACT_COLORS.map((color, index) => ({ color, icon: CHAT_CONTACT_ICONS[index % CHAT_CONTACT_ICONS.length] })),
  )
  assert.equal((CHAT_CONTACT_COLORS as readonly string[]).includes(style.color), true)
  assert.equal((CHAT_CONTACT_ICONS as readonly string[]).includes(style.icon), true)
})
