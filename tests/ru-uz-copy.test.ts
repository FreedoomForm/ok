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

// Cycle 168: the super-admin governance surface rendered English fallback copy
// (search placeholder, status filter labels, create command, metric labels and
// the chat tab trigger) inside a RU/UZ-only product — the same §13/§18 violation
// class the dictionary-level tests already close for the admin dashboard. The
// governance page must source every visible string from the shared dictionary,
// and the offline fallback must be language-aware instead of English-default.

test('the super-admin governance surface sources visible copy from the RU/UZ dictionary', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/super-admin/page.tsx'), 'utf8')
  const deadMarkers = [
    'placeholder="Search by name or email"',
    "label=\"All\"\n",
    "label=\"Active\"",
    "label=\"Paused\"",
    '\n                          Create\n',
    "detail=\"Card / Cash\"",
    'label="Middle admins"',
    'label="Orders observed"',
    'label="Delivery success"',
    'label="Payment mix"',
    '\n                        Saving...\n',
  ]
  for (const marker of deadMarkers) {
    assert.equal(source.includes(marker), false, `governance surface must not render dead English copy: ${JSON.stringify(marker)}`)
  }
  // The replacement seams must come from the shared dictionary.
  assert.match(source, /t\.admin\.searchByNameEmail/)
  assert.match(source, /t\.admin\.activeFilter/)
  assert.match(source, /t\.admin\.pausedFilter/)
  assert.match(source, /t\.admin\.create/)
  assert.match(source, /t\.admin\.middleAdmins/)
  assert.match(source, /t\.admin\.ordersObserved/)
  assert.match(source, /t\.admin\.deliverySuccess/)
  assert.match(source, /t\.admin\.paymentMix/)
  assert.match(source, /t\.admin\.chat/)
})

test('the offline fallback is language-aware with no English-default copy', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/offline/page.tsx'), 'utf8')
  assert.match(source, /localStorage\.getItem\('language'\)/)
  assert.match(source, /'uz'/)
  assert.doesNotMatch(source, /You are currently offline/)
  assert.doesNotMatch(source, /Open Home/)
  assert.doesNotMatch(source, /Open Login/)
  // RU must be the fallback locale when nothing is stored (RU/UZ-only contract).
  assert.match(source, /useState<Copy>\(RU\)/)
})

test('governance dictionary keys exist and stay congruent between RU and UZ', () => {
  for (const key of [
    'searchByNameEmail', 'activeFilter', 'pausedFilter', 'middleAdmins', 'activeShort',
    'ordersObserved', 'pendingShort', 'deliverySuccess', 'deliveredShort', 'paymentMix',
    'cardCash', 'chat', 'saving',
  ] as const) {
    assert.ok(key in translations.ru.admin, `ru.admin.${key} must exist`)
    assert.ok(key in translations.uz.admin, `uz.admin.${key} must exist`)
  }
  assert.equal(translations.ru.admin.pausedFilter, 'Приостановлены')
  assert.equal(translations.uz.admin.pausedFilter, 'To\u2018xtatilgan')
})

test('the finance balance card carries no legacy blue/indigo fills', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/admin/FinanceTab.tsx'), 'utf8')
  assert.doesNotMatch(source, /bg-blue-600/)
  assert.doesNotMatch(source, /bg-indigo-600/)
  assert.doesNotMatch(source, /text-blue-900/)
  assert.doesNotMatch(source, /text-blue-700/)
  // The flat warm grammar keeps numbers in ink and actions as outline chips.
  assert.match(source, /text-2xl font-bold text-foreground/)
  assert.match(source, /variant="outline"/)
})
