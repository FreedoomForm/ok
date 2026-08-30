import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { translations } from '../src/lib/translations'

// Addendum §13: "RU/UZ is the only language toggle; English is removed from
// user-facing selector and fallback copy." The authoritative gap register
// (§18) names "English fallback labels remained" as a gap that must be closed
// by implementation plus a named test. These tests pin the RU/UZ-only copy
// contract at the dictionary level, at the context level and at the source of
// the highest-traffic admin surface.

test('translations dictionary exposes exactly the RU and UZ locales', () => {
  const locales = Object.keys(translations).sort()
  assert.deepEqual(locales, ['ru', 'uz'])
  assert.equal('en' in translations, false, 'the dead English dictionary must not return')
})

test('RU and UZ dictionaries keep congruent top-level sections', () => {
  const ru = Object.keys(translations.ru).sort()
  const uz = Object.keys(translations.uz).sort()
  assert.deepEqual(ru, uz)
  assert.ok(ru.length > 0)
})

test('LanguageContext migrates the legacy stored English locale to Russian', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/contexts/LanguageContext.tsx'), 'utf8')
  assert.match(source, /savedLang === 'en'/)
  // The migration must persist Russian, not serve English.
  assert.match(source, /localStorage\.setItem\('language', 'ru'\)/)
  assert.doesNotMatch(source, /setLanguage\('en'\)/)
  assert.doesNotMatch(source, /as Language$/, 'the saved locale must be narrowed as a plain string')
})

test('the admin dashboard carries no unreachable English fallback copy', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/admin/AdminDashboardPage.tsx'), 'utf8')
  const deadMarkers = [
    "'Security, account context, and quick navigation from one place'",
    'noDateSelected: \'No date selected\'',
    "database: 'Database'",
    "searchClientPlaceholder: 'Search client...'",
    "searchOrdersPlaceholder: 'Search by name, address, or order number...'",
  ]
  for (const marker of deadMarkers) {
    assert.equal(source.includes(marker), false, `dead English fallback marker must stay removed: ${marker}`)
  }
  // The profile copy memo must end on the UZ terminal return, not an English one.
  const memo = source.slice(source.indexOf('const profileUiText = useMemo'), source.indexOf('}, [language])', source.indexOf('const profileUiText = useMemo')))
  assert.match(memo, /if \(language !== 'uz'\)/)
  assert.match(memo, /Profil markazi/)
  assert.doesNotMatch(memo, /Profile center/)
})
