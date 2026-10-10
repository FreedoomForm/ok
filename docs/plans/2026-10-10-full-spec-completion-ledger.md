# Ledger — полное выполнение спецификации (C0–C12) — 2026-10-10

План: `2026-10-10-full-spec-completion-plan.md` (реестр R1–R51, циклы C0–C12).
Источники истины: `pasted_content_3.txt`, `pasted_content_4.txt`, `pasted_content_5.txt`.
Формат: каждая запись — цикл → что сделано (файл:строка) → гейты → сверка со спецификацией.

Статусы: PLANNED → IN_PROGRESS → DONE.

---

## C0 — Правка документации

Статус: DONE

Что сделано:
- `2026-09-19-unified-ui-plan.md` ревизия 1.2: заголовок статуса → «FULL-CLOSED, статусы уточнены аудитом 2026-10-10»; добавлена ревизия-плашка с исправлениями (rail слева по финальной фиксации pasted_content_3; scanner исключён из набора 8 универсальных кнопок).
- Карта выполнения §1–§12 приведена к фактам аудита §0 плана 2026-10-10: §4/§5/§6/§8/§9/§11 → PARTIAL со ссылками на аудит и циклы C2/C5–C6/C8/C9/C10; §2 → DONE с остатками → C12; §1/§3 → rail слева, scanner исключён.
- Создан этот ledger.

Сверка со спецификацией: противоречия «справа vs слева» и «scanner в/вне набора» разрешены как в §1 плана 2026-10-10 (rail слева; scanner вне набора).

Гейты: grep-проверка «справа»-заявлений (навигация) — заменены; docs-only, код не тронут; commit.

---

## C1 — Каркас universal-кнопок: поиск-раскрытие, метки, мёртвый код

Статус: DONE

Что сделано (R1, R2, R16, R21 + подготовка R22):
- **Поиск круглый с раскрытием** (R16): `UniversalCommandBar.tsx` — кнопка search получила `rounded-full` (единственная круглая в наборе); по нажатию (без ключа) раскрывает на месте popover `data-reference-search-popover` с двумя действиями — «Фильтр» и «Календарь» (`data-reference-search-action="filter|calendar"`), которые открывают существующие отдельные окна (фильтр-окно, календарь-окно). Управляемое состояние `searchPopoverOpen` в AdminDashboardPage; редьюсер остался источником истины (эффект `open-search-page` открывает popover). Размер 56×56 сохранён.
- **Окно поиска удалено**: `SearchResourcePage.tsx` удалён (использовал текстовый ввод, которого нет в финальной грамматике R16 — точный поиск по колонке даёт фильтр-окно, C3); ветка `auxiliaryPage === 'search'` убрана, тип auxiliaryPage — `filter | calendar | null`.
- **Метки** (R21): страница cooking в rail — «Готовка/Tayyorlash» (было «Склад/Ombor») — AdminDashboardPage.tsx:582.
- **Мёртвый код**: из `WorkspaceEffect` удалены `open-trash-page` (никогда не производился/не потреблялся) и `blocked-observation-command` (наблюдение глотает команды с effect=null; редьюсер упрощён, комментарий в workspace-state.ts:145-150).
- **eye без ключа → R22-prep**: `open-audio-page` теперь открывает Калькулятор со скроллом к AI-секции (`handleResourcePageSelect('calculator')` + scrollIntoView `data-reference-ai-section`), а не чат-диалог; `data-reference-ai-section="true"` добавлен в CalculatorTab.tsx:347.

Тесты:
- `tests/workspace-state.test.ts`: assertion blocked-observation-command → effect null (жёсткая блокировка без побочного канала).
- `tests/unified-command-shell.spec.ts`: круглая форма search (computed radius ≥ половины тайла; Chromium отдаёт clamped ≈3.3e7px для rounded-full), R22-prep: выход из наблюдения (key+eye) ведёт на калькулятор, затем возврат в chat подтверждает восстановление интерактивности.
- `tests/search-filter-calendar-windows.spec.ts`: переписан на грамматику R16 (круглая кнопка → popover → Фильтр/Календарь-окна как прежде).
- `tests/calendar-override-source.spec.ts`: путь к календарю через popover.

Сверка с pasted_content_3: «iskat … kak kruglyu knopku kotoraya raskrivayetsa i imeyet dve universalnih knopok kalendarya i filtra» — выполнено; календарь и фильтр остались отдельными окнами.

Гейты: typecheck 0 · lint 0 errors · test:unit 359/359 · build green · Playwright chromium 9/9 (unified-command-shell, search-filter-calendar-windows, calendar-override-source) · Mobile Chrome 8/8 · commit+push.

---

## C2 — Режимы: авто-SMS, корзина всех ресурсов, создание, история, ветки

Статус: DONE

Что сделано (R5, R6, R24, R25, R26):
- **Авто-SMS off → системное сообщение** (R6): новый эндпоинт `POST /api/chat/system-notice` (SYSTEM message в «Систему» через `ensureSystemContactWithRetry`, systemCode AUTO_SMS_DISABLED); консьюмер эффекта `internal-auto-sms-disabled` отправляет notice (RU/UZ) и открывает чат. SMS-кнопка краснеет в выключенном состоянии: `smsOff`-проп → `data-reference-sms-off="true"` + красный тон; ключ остаётся active.
- **Корзина всех ресурсов** (R5): orders/clients — trash-ветка контента (`data-reference-trash-list`) рендерит binOrders/binClients с чекбоксами; «+» восстанавливает через существующий restore-pipeline; admins/couriers — `showDeleted=true` в useDashboardData при trash-режиме; вход в trash-режим обновляет bin-списки. Фикс: sync-эффект legacy-селекции и active-list reconcile заглушены в trash-режиме (селекция удалённых строк — источник истины workspaceState).
- **Универсальное создание** (R24): `UniversalCreatePage.tsx` — строки создания (клиент, ингредиент, виртуальная карта, контакт, блюдо), последняя выбранная строка = строка создания (★), раскрытие → мини-форма → «+» POST к существующим API; созданное появляется однострочной таблицей (`data-reference-created-rows`). Рендерится в режиме `create` (key+plus из любой страницы).
- **История действий** (R25): режим `action-history` (key+edit) рендерит HistoryTable по выбранным элементам: action-logs API получил фильтры entityType/entityId (OR-пары), HistoryTable — `entityFilter`-проп; карта HISTORY_ENTITY_TYPES по ресурсам; клиенты пишут CREATE_CLIENT audit-строку.
- **Временные ветки** (R26, §3.4): `BranchesPanel.tsx` — создать/применить/отбросить ветку; снапшот (страница, поиски, фильтр-колонки, селекция включая контакты) через `snapshotFromState`; лог действий внутри ветки (recordBranchAction в handleUniversalCommand); хранение sessionStorage (ключ workspace-temporary-branches:v1), без изменений схемы БД — допущение §3.4 зафиксировано.

Тесты: `tests/workspace-branches.test.ts` (+4 unit: create-режим, ветки/история-режимы, auto-SMS off, снапшот) · `tests/full-spec-c2-modes.spec.ts` (4 E2E: sms-off→сообщение+красный тон, создание клиента, trash-список+restore, история по выбранному клиенту).

Сверка с pasted_content_3/4: «nazhatie SMS → fon krasnyy + sistemnoe soobshchenie v chat "avto-otpravka otklyuchena"» — выполнено; «poslednyaya vybrannaya stroka = stroka sozdaniya» — выполнено.

Гейты: typecheck 0 · lint 0 errors · test:unit 363/363 · build green · Playwright chromium 11/11 (C2 4/4 + регрессия unified-command-shell 7/7) · commit+push.

## C3 — Фильтр-окно: реальные колонки и точный поиск по колонке

Статус: DONE

Что сделано (R17):
- **Реальные колонки per-resource**: `DEFAULT_FILTER_COLUMNS` (фиктивные name/status/date/balance) заменён реестром `RESOURCE_FILTER_COLUMNS` (clients: имя/телефон/адрес; orders: имя/телефон/статус/дата; admins/couriers: имя/email/статус; и т.д. — 15 ресурсов) + расширенный FILTER_COLUMN_LABELS (ru/uz: телефон, адрес, email, количество).
- **Левое окно**: фильтр рендерится как левая панель (`data-reference-filter-aside`, w-72/lg:w-80) РЯДОМ со списком (`data-reference-filter-layout`), а не вместо контента; страница остаётся видимой справа.
- **Точный поиск по колонке**: при выключенном ключе под включённой колонкой появляется input (`data-filter-column-input`); введённое фильтрует строки точно по этой колонке. Подключено к спискам: clients (filterResources 4-й аргумент), orders (inline-фильтр: name/phone/status/date), ingredients (через WarehouseTab → IngredientsManager: name/amount/status). При включённом ключе — тумблеры вкл/выкл колонок (как прежде).
- X справа-сверху, Очистить слева-снизу (теперь также чистит column filters), Сохранить справа-снизу — сохранены.
- Фильтры колонок живут в `columnFiltersByResource` (per-resource карта), не сбрасывают выбор.

Тесты: `tests/resource-state.test.ts` +1 (exact-column: значение не протекает через чужую колонку; AND по колонкам) · `tests/search-filter-calendar-windows.spec.ts` расширен: левое окно (layout+видимость списка), точный ввод по колонке фильтрует список ингредиентов.

Сверка с pasted_content_3: «filtr kak levoye okno… pri otklyuchennom klyuche mojno vvesti v vklyuchennuyu stroku vvoda opredelennoy kolonki… iskat eto chto to tochno po etoy kolonke» — выполнено.

Гейты: typecheck 0 · lint 0 errors · test:unit 364/364 · build green · Playwright chromium 13/13 (2 C3 + 11 регрессия) · commit+push.
