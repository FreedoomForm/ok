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

// Cycle 172: the reference audit exposed remaining user-facing English and
// RU-only (no UZ branch) strings across the order-details modal, tables,
// dialogs and the live dispatch map — the same §13/§18 violation class. Every
// surface below must source its copy from language-aware RU/UZ expressions.
test('admin modals, tables and maps carry no unreachable English or RU-only copy', () => {
  const surfaces: Array<[string, string[]]> = [
    ['src/components/admin/AdminDashboardPage.tsx', [
      '<span className="text-slate-500">Priority</span>',
      '<h4 className="font-semibold text-sm">Timeline</h4>',
      '<h4 className="font-semibold text-sm">Timeline', // legacy english header
      'Loading timeline...',
      '<p className="text-xs text-muted-foreground">No events yet</p>',
      "{event.actorName || 'System'}",
      'Loading resource details...',
      '<DialogTitle>Создать Курьера</DialogTitle>',
      "<DialogDescription>\n              Создайте новый аккаунт для курьера\n            </DialogDescription>",
      "{isCreatingCourier ? 'Создание...' : 'Создать'}",
      'text-slate-500">Количество:</span>',
      'text-slate-500">Калории:</span>',
      "toLocaleString('ru-RU')",
      'toLocaleDateString(\'ru-RU\')',
      'text-sm text-muted-foreground">Loading...</div>',
      '<p className="text-xs tracking-wide text-muted-foreground">Loading...</p>',
    ]],
    ['src/components/admin/OrdersTable.tsx', [
      '<TableHead>Priority</TableHead>',
      '<TableHead>Updated</TableHead>',
      "${order.etaMinutes} min",
    ]],
    ['src/components/admin/dashboard/tabs-content/AdminsTab.tsx', [
      'aria-label="Select all admins"',
      '<TableHead className="w-[100px]">Delivered</TableHead>',
      '<TableHead className="w-[120px]">Not Delivered</TableHead>',
      "?? 'Balance'}",
      'text-right">Withdrawn</TableHead>',
    ]],
    ['src/components/admin/dashboard/modals/ClientEditorDialog.tsx', [
      '<Label htmlFor="clientName" className="text-right">Name</Label>',
      '<SelectValue placeholder="Plan" />',
      'Select weekdays for automatic order creation',
      '<Label className="pt-2 text-right">Delivery days</Label>',
      '<SelectValue placeholder="None" />',
    ]],
    ['src/components/admin/dashboard/modals/OrderModal.tsx', [
      '<Label className={labelClass}>Group</Label>',
      '<SelectItem value="CASH">Cash</SelectItem>',
      '<SelectItem value="CARD">Card</SelectItem>',
    ]],
    ['src/components/admin/HistoryTable.tsx', [
      '<TableHead>Entity</TableHead>',
    ]],
    ['src/components/admin/SetsTab.tsx', [
      'shrink-0">Selected</Badge>',
    ]],
    ['src/components/admin/dashboard/shared/ResourceDetailSheet.tsx', [
      "target?.title || 'Resource details'",
      '<SheetDescription>Transactions, contracts, actions and related orders</SheetDescription>',
      "<Badge variant=\"outline\">No details</Badge>",
      "'Failed to load details'",
    ]],
    ['src/components/admin/orders/DispatchMapPanel.tsx', [
      '>No coords</Badge>',
      'aria-label="Переместить остановку"',
    ]],
    ['src/components/admin/orders/MiddleLiveMap.tsx', [
      'Smart live dispatch map',
      'text-muted-foreground">Realtime Ops</p>',
      '<SelectItem value="__none__">Unassigned</SelectItem>',
      "Saving...' : 'Save courier'",
      'Couriers: {liveCouriers.length}</Badge>',
      'text-xs">Orders</Button>',
      '<label>Lat<',
      '<label>Lng<',
    ]],
    ['src/components/admin/SiteBuilderCard.tsx', [
      '<Label htmlFor="subdomainUrlInput">Subdomain</Label>',
    ]],
    ['src/components/admin/SiteStyleRendersDialog.tsx', [
      '<DialogTitle>Style renders</DialogTitle>',
      '<DialogDescription>Select a style to preview renders.</DialogDescription>',
      '<CardTitle className="text-base">Preview context</CardTitle>',
      '<Label>Company name</Label>',
      'Reset to landing</Button>',
      '>Plan status</h2>',
      '>Today menu</h2>',
      '>Dish example</p>',
    ]],
  ]
  for (const [file, markers] of surfaces) {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8')
    for (const marker of markers) {
      assert.equal(source.includes(marker), false, `${file} must not carry dead copy: ${marker}`)
    }
  }
})

test('localized loading fallback follows the selected language', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/admin/dashboard/shared/LocalizedLoading.tsx'), 'utf8')
  assert.match(source, /Yuklanmoqda/)
  assert.match(source, /Загрузка/)
  assert.doesNotMatch(source, /Loading\.\.\./)
})
