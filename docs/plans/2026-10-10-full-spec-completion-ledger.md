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

## C4 — Режимы вкл/выкл: фильтрация списков + поддержка периода

Статус: DONE

Что сделано (R7, R14, R15):
- **Период** (R14): `commitWorkspaceMode` применяет enable/disable к диапазону: `selectedPeriod?.from..to` (или выбранный день) → `buildAvailabilityRangeDates` (включительный по-дневной ISO-список) → bulk-PUT батчами `chunkAvailabilityBatches` (≤500, как reassign); тост с числом применённых дней. Новая либа `src/lib/contracts/availability-range.ts`.
- **Фильтрация списков** (R15): в режимах enabled/disabled списки сужаются до соответствующего состояния доступности: clients (isActive), orders (CANCELED → DISABLED), admins/couriers-ростер (isActive; low-admins API включает COURIER), виртуальные карты в финансах (FinanceTab `availabilityMode`-проп). Хелпер `filterResourcesByAvailabilityState` — чистый, покрыт unit.
- Списки-переменные: `visibleOrders` → OrdersTab (+ select-all математика), `visibleLowAdmins` → AdminsTab (страницы admins/couriers), `filteredClients` — двойной фильтр (поиск+режим).
- Попутный фикс API: `buildClientCreateData` уважает `isActive` из payload (был хардкод true).

Тесты: `tests/availability-range.test.ts` (+3 unit: включительный диапазон, чанки ≤500, режимная фильтрация) · `tests/full-spec-c4-availability.spec.ts` (E2E: enabled-режим прячет неактивного клиента → apply через Сохранить → availability GET = ENABLED → disabled-режим показывает только неактивного; календарь-окно открывается/закрывается по грамматике).

Сверка с pasted_content_3: «universalniye knopki otklyuchit i vklyuchit otklyuchayut ili vklyuchayut vibranniy den ili period… rejimi pokazivayut otklyuchenniye ili vklyuchenniye klienti kuryeri zakazi karti virtualniye karti» — выполнено (день/период через выбранную дату/период календаря; углубление day-размерности effective-движком — C5).

Гейты: typecheck 0 · lint 0 errors · test:unit 367/367 · build green · Playwright chromium 6/6 (1 C4 + 5 регрессия) · commit+push.

## C5 — Availability: жёлтый период, каскад вперёд, маркеры, продление

Статус: DONE

Что сделано (R9–R13, R18; §3.3):
- **Ядро** `src/lib/contracts/effective-period.ts`: `decideContractDay`/`effectiveContractDay` — контракт-день включён ⇔ контракт ENABLED + покрывающий период ENABLED + день в `enabledWeekdays` + последнее решение (override на [periodStart..день]) не DISABLED. Отключение дня каскадом гасит все последующие дни периода; явное пере-включение перезапускает включённый отрезок (матрица вкл→выкл→вкл). `isOrderSuppressedByContractCascade` — заказ в эффективно отключённом дне скрыт (ORDER-ENABLED ре-включает). `computeRenewalExtensionDay` — виртуальный день-продление +7 за endDate последнего ENABLED autoRenew-периода (диапазон по `nextRenewalPeriod`).
- **Маркеры границ** (R12) `src/lib/contracts/period-boundaries.ts`: `computePeriodBoundaryMarkers` — на каждый переход отрезка рендерится виртуальный маркер-день (состояние ЗАКАНЧИВАЮЩЕГОСЯ отрезка) на нейтральном слоте непосредственно перед новым отрезком; если сосед — релевантный день, граница уже видна без виртуальной плитки. Решение задокументировано: маркеры только на нейтральных слотах, без записей в БД.
- **Жёлтая подсветка** (R9) в `ResourceCalendarPanel`: режим contract-view (проп `contractTimeline` от ContractsTab) — эффективно включённые дни периода `bg-amber-100` + янтарная рамка; отключённые (каскад/override) — красные; нейтральные дни — прежнее зелёный/красный по override. `data-effective-state`/`data-cascade`/`data-calendar-date` для E2E.
- **Линия курьера** (R13): полоса периода красится `getCourierColor(period.courierId)` (fallback: цвет периода): inset-слева на каждом дне периода + top-border на первом дне периода; existing first-day-маркеры сохранены.
- **Продление +7** (R11): виртуальная янтарная плитка `+7 · Продление` сразу после endDate последнего периода (когда окно её включает), `data-virtual-marker="RENEWAL"`.
- **Каскад заказов** (R18): `getResourceAvailabilityStates` (обе стороны override) в resource-availability; `loadContractCascadeDisabledDatesByCustomer` + `filterRowsOnContractCascade` в contract-effective; `/api/courier/orders` после точного фильтра применяет каскад — заказ в эффективно отключённом дне не попадает в список курьера, ORDER-override ENABLED ре-включает строку. Сторона записи ORDER-override уже существовала (universal enable/disable пишет `resourceType: 'ORDER'`).

Тесты: `tests/contract-effective-period.test.ts` (10 unit: база, гейты weekday/contract/period, stored disabledDates, каскад, вкл→выкл→вкл, выкл→вкл, вне периода, R18, R11+7) · `tests/contract-period-boundaries.test.ts` (8 unit: смежная граница без маркера, нейтральный слот, матрица вкл→выкл→вкл, окно, один отрезок, дедупликация слота, stored disabledDates, контракт DISABLED) · `tests/full-spec-c5-availability-cascade.spec.ts` (E2E: отключение дня → последующие дни красные с data-cascade + янтарный отрезок до + плитка +7; курьер не видит заказы каскадного дня, ORDER-override ре-включает).

Сверка с pasted_content_3: «perviy den kotrakta avtomaticheski budet vklyuchennim dnem i budet goret jeltim… dni kotoriye nahodyatsa posle dnya otklyucheniya ne budut aktivnymi… pered etim vklyuchennim dnem poyevlyayetsa otklyuchenniy den… v den okonchaniya kontrakta poyavitsa vklyuchenniy den kotoriy avtomaticheski prodlevayet kontrakt na sem dney… kuryer ne budet poluchat informatsiyu» — выполнено.

Гейты: typecheck 0 · lint 0 errors · test:unit 385/385 · build green · Playwright chromium 2/2 C5 + 15/15 регрессия C1–C4 + Mobile Chrome 2/2 · commit+push.

## C6 — Контракты: окно клиента целиком + уведомления + каскад заказов

Статус: DONE

Что сделано (R8, R10, R18):
- **Окно клиента** (R8): ClientEditorDialog после дней доставки получает блок контракта (create-флоу): Select курьера-ответственного, чекбокс оплачен/не оплачен, выбор периода **в календаре** (`CalendarRangeSelector`, react-day-picker range) вместо input[type=date]. POST `/api/admin/clients` принимает опциональный `contract`-блок (схема `clientContractWindowSchema`) и в ОДНОЙ транзакции создаёт клиента + контракт + первый период (`createContractWindowForClient`: период ENABLED + autoRenew, weekdays = выбранные дни доставки через `buildClientContractWeekdays`, ActionLog CREATE_CONTRACT). ContractsTab остаётся для существующих.
- **Чистка defaultCourierId** (R8): фоллбэки убраны из `api/orders` (курьер = `resolveEffectiveCourierId` по контракту, покрывающему дату доставки; явный выбор курьера сохраняет приоритет при отсутствии периода), `cron/scheduler` и `admin/scheduler` (курьер из покрывающего ENABLED-периода, latest-start побеждает). Колонка `defaultCourierId` в схеме осталась (legacy, только чтение); из select'а планировщика убрана.
- **Уведомления курьеру** (R8/R10): cron/scheduler после цикла собирает заказы дня, фильтрует каскадом (`filterRowsOnContractCascade` — каскадно-отключённые дни молчат) и пишет курьеру SYSTEM-сообщение со списком дня (`buildCourierDayListNotification` + `createCourierDayListNotification`, код `COURIER_DAY_LIST:<date>`, идемпотентно на (курьер, дата)); в ответе крона `notificationsSent`.
- **Каскад заказов, write-side** (R18): включение ОДНОГО заказа (bulk-PUT resource-availability, resourceType ORDER, state ENABLED, один id) пинит CONTRACT-DISABLED override на соседние даты периода (`pinContractNeighborsForOrderEnable`) — единичный включённый заказ остаётся явно ограниченным «островом» с маркерами границ из C5. Read-side (фильтр списка курьера + ORDER-override ре-включение) — из C5.

Тесты: `tests/client-contract-window.test.ts` (+2 unit: weekdays из дней доставки, рендер/кап списка дня) · `tests/client-contract-window.integration.test.ts` (+2 integration: транзакционное создание контракта окна + идемпотентность дневного уведомления) · `tests/full-spec-c6-client-contract-window.spec.ts` (E2E: диалог → курьер/оплачен/период-календарь → период создан с курьером и авто-продлением → янтарный день в календаре контрактов; крон → заказ дня у курьера → сообщение COURIER_DAY_LIST → заказ виден курьеру). Ресурс-календарь: неназначенные будни периода больше не красятся красным (нейтральные), только каскад/override.

Сверка с pasted_content_3: «vmesto vibora skutera tut vibirayetsa kuryer pri sozdanii… vipolnyaetsa sohraneniye klienta» / «v kajdiy ponedelnik i vtornik naznachenniy na etot kontrakt kuryer budet poluchat uvedomleniya v stranitse chata» / «eti zakazi ne budut vhodit v spisok kuryera» — выполнено.

Гейты: typecheck 0 · lint 0 errors · test:unit 387/387 · test:integration 13/13 · build green · Playwright chromium 2/2 C6 + 17/17 регрессия C1–C5 + Mobile Chrome 2/2 · commit+push.

## C7 — Распределение курьеров: dnd-доска + очередь мультиотключения

Статус: DONE

Что сделано (R19, R20):
- **DnD-доска переназначения** (R19): новый `CourierReassignmentBoard` (dnd-kit + клик-фоллбэк: клик по заказу → клик по курьеру) — заказы слева (номер, дата, статус, клиент), курьеры справа, назначение через DragEnd/клик, Save заблокирован, пока хоть один заказ без курьера. Диалог переназначения поднят на корень workspace (вне тернарной цепочки страниц) — теперь рендерится на любой странице, включая страницу очереди (найдено E2E: состояние open, а диалога в DOM нет — сидел в else-ветке `auxiliaryPage === 'calendar'`).
- **Чистый редьюсер**: `src/lib/admin/reassignment-board.ts` — чистая функция назначения (toggle/replace), покрыта юнит-тестами (5: пустой выбор, клик-выбор, переключение, замена, очистка).
- **Очередь мультиотключения** (R19, §3.2 R20): выбор нескольких курьеров → key → disable → Save превращает страницу выбранных курьеров в очередь распределения: строка «Распределить» открывает доску, «Переназначить и отключить» убирает курьера из очереди и деактивирует его, Cancel закрывает диалог, оставляя строку; стрелка слева (Назад) возвращает в workspace; после последнего курьера режим подтверждается.

Тесты: `tests/reassignment-board.test.ts` (+5 unit) · `tests/full-spec-c7-reassignment-selected.spec.ts` (E2E chromium + Mobile Chrome: одиночное отключение распределяет заказ на доске и деактивирует курьера; мультиотключение открывает очередь с семантикой исчез/остался — сохранённый исчезает, отменённый остаётся, стрелка возвращает в workspace, БД-проверка isActive).

Сверка с pasted_content_4: «okno raspredeleniya zakazov mejdu kurierami … peretaskivaniye zakazov na kuryera … knopka sohraneniye ne aktivna poka yest zakazi bez kuryera» / «otklyucheniye neskolkih kuryerov srazu — stranitsa prevrashayetsa v ochered raspredeleniya» — выполнено.

Гейты: typecheck 0 · lint 0 errors · test:unit 392/392 (+5) · test:integration 13/13 · build green · Playwright chromium 2/2 C7 + 10/10 регрессия C1–C6 + Mobile Chrome 2/2 · commit+push (12ba070).

## C8 — Чат: слой контактов, провижининг, цвета, детали

Статус: DONE

Что сделано (R27–R34):
- **Слой** (R27): новый `ChatContactsRail` — второй слой слева с грамматикой `ResourcePageRail` (w-16/72px, size-14 скруглённые квадраты), рендерится ЛЕВЕЕ rail страниц на странице chat: `[ChatContactsRail][ResourcePageRail][контент]`. Квадраты окрашены цветом контакта с профессиональной иконкой, точка непрочитанных, активная беседа — ring; кнопка «+» создания внизу. На узких экранах (<lg) слой сворачивается в Sheet (кнопка-триггер слева сверху, те же квадраты внутри). Связь слоя с чатом — DOM-события (`chat:open-conversation`, `chat:open-create-window`, `chat:contacts-refresh`, `chat:conversation-opened`).
- **Провижининг** (R28): `ensureSystemContactWithRetry` вызывается СРАЗУ при создании аккаунта: signup (`/api/auth/signup`, best-effort) и API создания админов/курьеров (`admin/low-admins`, `admin/middle-admins`, `admin/couriers`). Имя системного контакта — «Система» (в БД; UI локализует «Tizim» для uz). Приветствие теперь несёт момент создания аккаунта: «Добро пожаловать в чат AutoFood. Аккаунт создан DD.MM.YYYY, HH:MM.»
- **Цвета** (R30): входящие пузыри красятся светлым тоном цвета контакта (`${color}24`), свои — справа primary; СИСТЕМНЫЕ сообщения — справа («от системы»), контакты — слева как в Telegram. Решение неоднозначности спецификации зафиксировано здесь: System → правая сторона, slate-тон.
- **Детали контакта** (R31/R34): шапка беседы кликабельна (`data-reference-chat-conversation-header`) → ResourceDetailSheet с новой detail-сущностью `chat-contact` (resource-detail-грамматика): карточка профиля (имя/телефон/состояние/аккаунт/роль/дата), системные сообщения провижининга (SYSTEM_WELCOME + CONTACT_PROVISIONED), история действий (ActionLog CHAT_CONTACT). При создании первого контакта пишется SYSTEM-сообщение «Контакт создан. Аккаунт … создан …».
- **Окно создания** (R32): отдельное окно-оверлей (`data-reference-contact-create-window`): имя, номер, палитра ТОЛЬКО невыбранных цветов и иконок (fallback — полный список, когда заняты все), Сохранить справа-снизу / Назад слева-снизу через `ResourceLocalActionBar`. Инлайн-форма убрана.
- **Universal enable/disable** (R33): на странице chat команды вкл/выкл маппятся в STATE контакта (ENABLED/DISABLED) через PATCH `/api/chat/contacts` (чистый маппер `src/lib/chat/contact-commands.ts`), БЕЗ availability-строк; календарь доступности из беседы убран; SYSTEM-контакт защищён (UI + API). Trash/rest — как был (state DELETED/ENABLED).

Тесты: `tests/chat-contact-commands.test.ts` (+4 unit: маппинг команд, защита SYSTEM, пул неиспользованных стилей) · `tests/chat-signup-provisioning.integration.test.ts` (+2 integration: статический guard проводки в signup + «Система»/приветствие с моментом создания сразу после провижининга) · `tests/full-spec-c8-chat-contacts.spec.ts` (E2E chromium + Mobile Chrome: новый аккаунт → Система с приветствием; окно создания → контакт на слое → провижининг-сообщение → отключённый контакт не пишет → детали с историей; universal disable → state DISABLED, 0 availability-строк).

Сверка с pasted_content_4/5: «soobsheniya ot drugih kontaktov … s levoy storony … kak u telegram» / «perviy kontakt — Sistema s privetstviem srazu posle sozdaniya akkaunta» / «okno sozdaniya kontakta — imya, nomer, tolko neispolzovanniye tsveta» — выполнено.

Гейты: typecheck 0 · lint 0 errors · test:unit 396/396 (+4) · test:integration 15/15 (+2) · build green · Playwright chromium 3/3 C8 + Mobile Chrome 3/3 + 12/12 регрессия C1–C7 · commit+push (d0c442a).

## C9 — Маршруты: гео-слой и жизненный цикл

Статус: DONE

Что сделано (R38–R47):
- **Карта** (R40/R43): новый `RoutesLeafletMap` (react-leaflet, база — DispatchLeafletMap): квадратные маркеры-инициалы заказов дня (белый фон, цветная рамка маршрута, подсветка в маршруте), клик-рисование полигона (минимум 3 вершины, замыкание двойным кликом или кнопкой «Замкнуть область»), полупрозрачный полигон **цветом курьера** (`getCourierColor`), при чтении — полигон выбранного маршрута. Кнопка «Выделить область» (hardcoded прямоугольник) удалена.
- **Гео-библиотека**: `src/lib/routes/geo-polygon.ts` — GeoJSON-полигон (kind: 'geo-polygon', lat/lng-вершины), ray-casting point-in-polygon, захват заказов по координатам доставки, детекция/игнорирование legacy panel-relative прямоугольников, нормализация (окно Ташкента, ≥3 вершин); период R46 (`nextMondayInclusive`: сегодня → следующий понедельник включительно, формат «ДД.ММ → ДД.ММ»).
- **Шапка** (R39/R46): «Предыдущий» слева / «Продолжить» справа шагают **по дням** (weekStart следует за днём), в центре — день + период «сегодня → следующий Пн».
- **Сайдбар маршрута** (R41/R42): справа от карты, фон = цвет маршрута: кубик инициалов курьера + иконка, имя, строка кубиков остановок; раскрытый список остановок — dnd-kit sortable (Pointer+Keyboard сенсоры), перетаскивание с места на место (1↔9) сохраняет позиции и перезапрашивает линию (R44: ORS `/api/admin/dispatch/ors-polyline`, fallback — прямые сегменты).
- **Левый сайдбар** (R38): группы курьеров получили профессиональные иконки (Truck в цветном квадрате) через расширение `SecondaryResourceRail` (optional icon).
- **Universal enable/disable** (R47): на странице routes команды вкл/выкл пишут `isActive` через adapter-мутации (`executeUniversalMutation('enable'|'disable')` — путь открыт, union расширен), НЕ availability-строки; rollforward не продлевает выключенные (фильтр isActive уже был в `planWeeklyRouteRollForward` — покрыто unit+integration).
- **Автопривязка** (R47): `src/lib/routes/auto-assign.ts` — заказ, чья точка доставки внутри полигона включённого маршрута недели, получает остановку (append) и курьера маршрута; подключено в `api/orders` POST и `api/admin/auto-orders/create`.
- **Миграция**: `DeliveryRoute.contractId String?` + FK → Contract (additive `prisma db push`), обратная связь `Contract.routes`.

Тесты: `tests/geo-polygon.test.ts` (+6 unit: point-in-polygon, захват порядка, legacy-детекция, нормализатор, период R46, rollforward-skip-inactive) · `tests/route-geo-lifecycle.integration.test.ts` (+2 integration: rollforward создаёт запись только активного маршрута; заказ внутри полигона автоматически попадает в маршрут с остановкой и курьером) · `tests/full-spec-c9-routes-geo.spec.ts` (E2E chromium + Mobile Chrome: рисование полигона кликами по карте → заказ внутри захвачен → маршрут с geo-полигоном и остановкой; навигация по дням + период + universal disable → isActive=false, 0 строк доступности; dnd-перетаскивание остановки → порядок в DOM и БД изменён, линия перезапрошена).

Инцидент восстановления: RoutesTab.tsx был случайно откачен (`git checkout`) до коммита — переписан заново из контекста (полная ревизия с накопленными правками: expandedCourierId, data-stop-id = order.id, preload полигона при edit). Техуроки: leaflet-контейнер внутри `min-h`-родителя с height:100% = 0 на мобильных (нужен definite height `h-[330px] lg:h-[460px]` без flex-1 в column-раскладке); карта ниже фолда на мобильных требует scrollIntoViewIfNeeded перед кликами; server-only модули под tsx тестируются с `NODE_OPTIONS=--conditions=react-server` (выделен скрипт `test:integration:routes`, глобальное применение условия ломает Prisma).

Гейты: typecheck 0 · lint 0 errors · test:unit 402/402 (+6) · test:integration 15/15 · test:integration:routes 2/2 · build green · Playwright chromium 3/3 C9 + Mobile Chrome 3/3 + 15/15 регрессия C1–C8 · commit+push (b87c157).
