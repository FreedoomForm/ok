# Полный план переноса UX и функциональной грамматики `-1` в AutoFood

**Дата:** 2026-08-24
**Автор:** Manus AI
**Основание:** приложенная пользователем спецификация `pasted_content.txt`, исходный код AutoFood и source-level аудит reference repository `ozodbekasilbekov2-gif/-1`.
**Цель:** не косметически изменить AutoFood, а перенести в него целостную модель управления ресурсами из `-1`, сохранив доменную логику доставки еды, текущие API, Prisma/PostgreSQL, роли, авторизацию, клиентский сайт, courier flow и Vercel deployment.

> **Ключевой принцип:** переносится не Android/Kotlin/Compose/Room-код, а поведение продукта: единый command surface, resource pages, selection-preserving modes, calendar-driven periods, master-detail workflows, explicit save/back semantics, auditability и компактная информационная архитектура. Reference служит UX-источником, а AutoFood остаётся web-приложением для food delivery.

## 1. Что именно должно быть получено

После реализации администратор должен видеть AutoFood как единое resource-management приложение. Вместо набора разрозненных таблиц, модальных окон и локальных кнопок пользователь получает один большой рабочий экран с верхней панелью, правой панелью страниц/настроек и универсальной нижней command-панелью. Нижняя панель содержит восемь универсальных кнопок: **Search, Create, Enable, Disable, Trash, Edit, SMS и Real-time AI**. Их смысл зависит от текущей страницы и выделенных ресурсов, но их положение, визуальная грамматика, keyboard behavior и подтверждение действий одинаковы.

Основной режим работы остаётся обычным. Выбранные строки не исчезают при переходе в режим корзины, редактирования, включённых или отключённых ресурсов, а режимы работают как представления поверх того же selection state. Универсальная кнопка-ключ является явным переключателем command mode: пока ключ выключен, опасные или специальные действия не активируются случайно; после включения кнопка получает зелёный статус и следующая универсальная кнопка переводит пользователя в соответствующий режим. В режимах корзины, SMS, AI и наблюдения статус ключа и статус активного режима должны быть видны одновременно.

Приложение должно содержать **15 основных страниц ресурсов** и **8 рабочих режимов**, перечисленных ниже. Chat, Settings и Database должны стать полноценными страницами/right-side panels, а не скрытыми вторичными dialogs. English больше не является пользовательским языком: интерфейс переключается только между Russian и Uzbek одним нажатием языковой кнопки.

## 2. Неприкосновенные ограничения

| Область | Что обязательно сохранить | Что можно изменить |
|---|---|---|
| Домен | Заказы food delivery, меню, блюда, ингредиенты, клиенты, couriers, low admins, finance, customer site | Названия экранов, расположение controls, resource workflows |
| Backend | Next.js 15, React 19, Prisma 5, PostgreSQL, NextAuth/Auth.js, существующие REST endpoints | Additive routes, adapters, новые таблицы и versioned response fields |
| Безопасность | SUPER/MIDDLE/LOW/Courier scope, group ownership, soft-delete, server-side authorization | Более строгие checks, audit events, idempotency и explicit confirmation |
| Данные | Никакого production reset, удаления старых клиентов/orders/transactions или автоматического восстановления | Только additive migrations после backup/inspection и rollback plan |
| API | Существующие URL и legacy response shapes должны продолжать работать | Новые поля добавляются backward-compatible; breaking change только через новую версию |
| UI | Существующие CRUD, order lifecycle, finance writes, warehouse calculations, customer/courier flows | Их triggers перемещаются в universal grammar, но действия остаются доступными |
| Deployment | Vercel-safe build без build-time `db push`, serverless-compatible reads/writes | Миграции выполняются отдельно, не внутри обычного build |
| Стиль | Flat, minimal, compact, без glass/3D/лишней анимации и длинного текста | Плотные таблицы, status colors, drawer/page transitions до 300 ms |
| AI | Никаких выдуманных покупок, цен или килограммов; только schema validation и human confirmation | Server-side multimodal extraction с audit trail и confidence/error states |

## 3. Полный перечень страниц и ресурсных обязанностей

Каждая страница должна иметь один и тот же внешний interface: `load`, `search`, `filter`, `select`, `create`, `edit`, `enable`, `disable`, `trash/restore`, `save`, `cancel/back`. Внутренняя implementation может отличаться, но caller и пользователь должны изучать одну interaction grammar.

| № | Основная страница | Основной ресурс | Главные данные | Универсальные действия |
|---:|---|---|---|---|
| 1 | Chat | conversations/messages | admins, conversations, unread count, messages | Create conversation, search, observe, back |
| 2 | Settings | interface/feature settings | theme, language, feature flags, permissions | Edit, create feature, enable/disable, save |
| 3 | Ingredients | warehouse items | name, amount, unit, price, kcal, purchase links | Create, edit, delete/trash, search, enable price source |
| 4 | Cooking | daily cooking plans | date, menu, dish quantities, cooked/remaining | Search/date, enable/disable plan, edit, save |
| 5 | Dishes | dishes | meal type, ingredients, calories, menus | Create, edit, delete/trash, search, filter |
| 6 | Groups | set calorie groups | group name, price, calories, dishes | Create, edit, delete, enable/disable |
| 7 | Sets | menu sets | set name, menu number, groups, active state | Create, edit, copy, enable/disable, trash |
| 8 | Finance | balances/ledger | company balance, customer/admin ledgers, transactions | Create, edit, search/filter, enable/disable, trash |
| 9 | Contracts | customer contracts/periods | customer, courier, weekdays, date periods, paid state | Create, edit, enable/disable period, search/filter |
| 10 | Transactions | transaction records | amount, type, category, customer/admin/card, date | Create, edit, trash, search/filter, confirm |
| 11 | Orders | order records | customer, date, status, payment, courier, lifecycle | Create, edit, enable/disable, trash, search/filter |
| 12 | Admins | all administrators | role, group, active state, courier data | Create, edit, enable/disable, trash, search/filter |
| 13 | Couriers | courier subset | courier identity, transport, workload, periods | Create, edit, enable/disable, reassign orders |
| 14 | Clients | customers | profile, contract periods, balance, orders, courier | Create, edit, enable/disable, trash, contract calendar |
| 15 | Calculator | planning calculation | selected dates, menu/set, needed stock, shopping list | Search/date, calculate, confirm, export/create purchase items |

`Bin` больше не является отдельной главной страницей. Он становится **режимом корзины** для текущей resource page. Это означает, что кнопка Trash не ведёт пользователя на отдельную старую таблицу, а переключает source/filter текущего ресурса на deleted/archived items, сохраняя выбранные элементы.

## 4. Архитектура: deep modules и seams

Реализация должна использовать несколько глубоких модулей с маленькими интерфейсами. Главный shell не должен знать детали каждой таблицы, а таблицы не должны копировать state machine modes. Публичные seams должны быть пригодны одновременно для UI и тестов.

### 4.1. `ResourceWorkspaceShell`

**Interface:**

```ts
type ResourcePageId =
  | 'chat' | 'settings' | 'ingredients' | 'cooking' | 'dishes'
  | 'groups' | 'sets' | 'finance' | 'contracts' | 'transactions'
  | 'orders' | 'admins' | 'couriers' | 'clients' | 'calculator'

type WorkspaceState = {
  page: ResourcePageId
  selectedIds: readonly string[]
  mode: WorkspaceMode
  search: SearchState
  calendar: CalendarState
}
```

Shell отвечает только за текущую страницу, selection registry, active command mode, top/right/bottom navigation, keyboard focus и route/deep-link restoration. Он не создаёт заказы, не редактирует клиентов и не вычисляет warehouse quantities.

### 4.2. `UniversalCommandController`

**Interface:**

```ts
type UniversalCommand =
  | 'search' | 'create' | 'enable' | 'disable'
  | 'trash' | 'edit' | 'sms' | 'realtime-ai'

type CommandState = {
  armed: boolean
  activeMode: WorkspaceMode | null
  command: UniversalCommand | null
}

function reduceCommand(state: CommandState, action: CommandAction): CommandState
function canRunCommand(context: CommandContext, command: UniversalCommand): boolean
```

Все переходы выполняются pure reducer’ом. UI не должен самостоятельно менять несколько несвязанных booleans. `canRunCommand` проверяет страницу, selection, role, mode, data availability и destructive confirmation requirements.

### 4.3. `SelectionRegistry`

Selection хранится по resource key и не сбрасывается при переходе между обычным видом, корзиной, edit page или reassignment page. У каждого selected ID должен быть source resource и snapshot label для отображения на selected-items page. После save registry удаляет только успешно сохранённые элементы; после cancel/back возвращает прежний selection.

```ts
type SelectionRegistry = {
  get(resource: ResourcePageId): readonly string[]
  toggle(resource: ResourcePageId, id: string): SelectionRegistry
  replace(resource: ResourcePageId, ids: readonly string[]): SelectionRegistry
  clear(resource: ResourcePageId): SelectionRegistry
  reconcile(resource: ResourcePageId, visibleIds: readonly string[]): SelectionRegistry
}
```

### 4.4. `ResourceAdapter`

Каждая страница предоставляет adapter, а не собственный новый filter engine.

```ts
type ResourceAdapter<T> = {
  id: ResourcePageId
  getId(item: T): string
  getSearchText(item: T): string
  getColumnValue(item: T, column: string): string | number | boolean | null
  columns: readonly ResourceColumn[]
  actions: readonly UniversalCommand[]
}
```

Filter semantics: search и каждый активный column filter объединяются через AND; значения внутри одного multi-value filter объединяются через OR. Date filter применяется только к timestamp/date field, нормализованному в UTC day boundary.

## 5. Universal top header и bottom command panel

### 5.1. Верхняя панель

На desktop верхняя область должна иметь два отдельных уровня. В верхней command-панели находятся **все восемь универсальных кнопок**: Search, Create/Plus, Enable, Disable, Trash, Edit, SMS и Real-time AI, а также кнопка-ключ и видимые red/green status indicators. Они всегда работают относительно открытой страницы и текущего selection. Отдельно слева находится вертикальная панель навигации со всеми кнопками основных страниц: она не смешивается с universal commands и не дублируется вторым desktop sidebar. Внизу находятся только кнопки, работающие с текущей страницей или draft workflow: Back, Save, Apply, Clear, Cancel и Confirm.

Справа верхнего header находятся глобальные controls: theme и RU/UZ language toggle, а Chat, Settings и Database открываются как отдельные right-side pages/panels с back arrow. Их открытие не уничтожает selection текущей resource page. Таким образом, окончательная иерархия строго такая: **страницы — слева, универсальные кнопки — сверху, локальные кнопки текущей страницы — снизу**. Это уточнение является обязательным и заменяет любую прежнюю неоднозначность о расположении universal buttons.

Language button не должен показывать dropdown из трёх языков. Он должен работать циклически только так: `ru → uz → ru`. В старых `en` settings при чтении используется безопасный fallback на `ru`; пользователю English больше не показывается. Все новые labels, aria-labels, errors, confirmations и empty states обязаны иметь RU и UZ variants.

### 5.2. Нижняя панель page-local actions

Bottom panel содержит только действия текущей страницы или открытого draft workflow. На desktop она фиксируется внизу и выравнивается вправо, как в reference; на mobile остаётся fixed/scrollable с touch targets не меньше 44 px. Универсальные кнопки и page-navigation buttons сюда не попадают. Обычно `Back/Clear/Cancel` находятся слева, а `Save/Apply/Confirm` — справа. Workspace получает достаточный bottom padding, чтобы таблица, drawer и последняя строка не перекрывались. Labels могут быть скрыты визуально, но остаются в `aria-label`, `title` и tooltip.

| Universal command | Обычный вид | После ключа | Цвет/статус |
|---|---|---|---|
| Search | Открывает search surface | Включает search mode | Neutral / active accent |
| Plus/Create | Открывает create row/dialog/page | Включает universal create mode | Primary |
| Enable | Включает выбранные day/period/resource | Включает enabled-resource mode | Green |
| Disable | Отключает выбранные day/period/resource | Включает disabled-resource mode | Red |
| Trash | Переключает корзину текущего ресурса | Включает trash mode | Red when active |
| Edit | Открывает selected-items edit page | Включает action-history/edit mode | Accent |
| SMS | Отправляет SMS selected clients или toggles auto-send | Включает SMS mode | Green when auto-send armed; red when disabled |
| Real-time AI | Открывает recording/AI workflow | Включает observation mode with key | Eye/AI accent |

Кнопка-ключ является отдельным маленьким global control в верхней universal command-панели. В исходном состоянии она выключена. Нажатие меняет `armed=false` на `armed=true` и фон на зелёный. Повторное нажатие снимает armed state, закрывает active special mode only when that mode requires the key, и возвращает безопасный обычный режим. Для Trash, Enable, Disable, Edit, SMS и Create action никогда не должны выполняться только от hover или long press. Back, Save, Clear, Cancel, Confirm и Apply всегда остаются page-local controls нижней панели и не требуют key для обычного подтверждения.

### 5.3. Keyboard и pointer rules

`Enter` на focused universal button выполняет тот же переход, что и click. `Space` не должен дважды выполнять action. `Escape` закрывает search/filter/calendar/page overlay без очистки selection. `Alt/Option + K` может быть добавлен как keyboard shortcut для ключа только после проверки, что он не конфликтует с browser shortcuts. Focus ring должен оставаться видимым в light/dark themes.

## 6. Восемь режимов: точная state machine

Режимы не должны быть восемью несвязанными booleans. Используется один discriminated union.

```ts
type WorkspaceMode =
  | { kind: 'normal' }
  | { kind: 'trash' }
  | { kind: 'enabled'; calendar: CalendarSelection }
  | { kind: 'disabled'; calendar: CalendarSelection }
  | { kind: 'action-history'; resource: ResourcePageId }
  | { kind: 'temporary-branch'; query: SearchState & CalendarState }
  | { kind: 'auto-sms'; armed: boolean }
  | { kind: 'create'; resource: ResourcePageId }
  | { kind: 'observation'; source: 'ai' }
```

В пользовательском описании перечислены восемь режимов, но `normal` является базовым состоянием и не считается отдельным command mode. `temporary-branch` — это фильтрованный branch-view, который открывается из Search. `auto-sms` — system behavior, а не просто список. Для каждого режима обязательны следующие правила.

| Режим | Вход | Что видно | Что разрешено | Выход |
|---|---|---|---|---|
| Trash | Key + Trash | deleted/archived rows текущего ресурса | restore через Plus, permanent delete только explicit existing flow | Key + Trash или page change |
| Enabled | Key + Enable | enabled clients/couriers/orders/cards/periods за date/range | enable selected scope | Save/Back/Cancel |
| Disabled | Key + Disable | disabled clients/couriers/orders/cards/periods за date/range | disable selected scope, reassignment if needed | Save/Back/Cancel |
| Action history | Key + Edit | audit/action records and selected resources | open one resource and edit safely | Save/Back |
| Temporary branch | Key + Search | search + date + filter branch | inspect/select only until applied | X/Back/Apply |
| Auto SMS | Key + SMS | SMS target list and auto-send status | send manually or toggle auto-send | confirm/cancel |
| Create | Key + Plus | create rows for current resource | add one or more rows, validate | Save/Back |
| Observation | Key + Real-time AI | read-only live UI/recording context | no ordinary click/mutation | Key + AI |

В observation mode все mutation buttons должны быть disabled на уровне DOM и server-side action guards должны отклонять неожиданные requests только если добавлена session mode token. Сам режим не может считаться security boundary; authorization всегда серверная.

## 7. Search, calendar и filter surface

### 7.1. Search button

Search должен быть круглой компактной кнопкой верхней universal command-панели, которая раскрывается в отдельную search surface. В ней есть две вторичные команды: Calendar и Filter. Search surface не должна быть постоянным куском каждой таблицы.

Верхний правый угол search/filter page имеет `X`. Нижняя page-local панель имеет `Clear` слева и `Save/Apply` справа. `Clear` очищает только draft query/filter state, а не глобальную selection. `Save` применяет draft state и создаёт temporary branch; `X` закрывает без применения.

### 7.2. Calendar page

Calendar открывается отдельной страницей/drawer, а не inline fragment. Он имеет controlled range state, quick actions Today/Week/Month, explicit start/end, timezone-safe UTC day normalization и optional highlighted range. Для contracts calendar получает дополнительные overlays: courier color line, enabled/disabled period, paid/unpaid marker и contract boundary. Статус нельзя изменить для дня, который не принадлежит выбранному contract/customer scope.

### 7.3. Filter page

Filter открывается слева как dedicated panel. В его правом верхнем углу находится close `X`; в левом нижнем — Clear; в правом нижнем — Save. В каждой колонке есть маленький key/toggle control. Когда колонка включена, она участвует в query. Когда key этой колонки выключен, пользователь может ввести точное значение для этой колонки, но оно не применяется до включения key. Status line колонки остаётся красной/зелёной и имеет тот же meaning, что и key button.

Column visibility и column filter — разные понятия. Visibility решает, показывать ли колонку в таблице; filter key решает, участвует ли колонка в запросе. Ни один из них не должен использовать long press. На desktop panel должен сохранять плотность reference, на mobile — открываться full-width.

## 8. Client contracts и calendar: главная доменная часть

Текущая `ClientEditorDialog` хранит простые `deliveryDays`, `defaultCourierId` и `autoOrdersEnabled`. Этого недостаточно для требуемого поведения. Новый workflow должен убрать старый отдельный `Default courier` из create/edit client form и перенести courier assignment в contract period calendar.

### 8.1. Contract model

Рекомендуемая additive Prisma model:

```prisma
model Contract {
  id           String   @id @default(cuid())
  customerId   String
  createdBy    String?
  status       ContractStatus @default(ACTIVE)
  startOn      DateTime
  autoRenewDays Int      @default(7)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  customer     Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  creator      Admin?   @relation(fields: [createdBy], references: [id])
  periods      ContractPeriod[]
  @@index([customerId, status, startOn])
}

model ContractPeriod {
  id          String   @id @default(cuid())
  contractId  String
  startsOn    DateTime
  endsOn      DateTime?
  state       ContractPeriodState @default(ENABLED)
  courierId   String?
  paymentState ContractPaymentState @default(UNPAID)
  changedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  contract    Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  courier     Admin?   @relation(fields: [courierId], references: [id])
  @@index([contractId, startsOn, endsOn])
}
```

Exact enum names can be adapted to existing Prisma conventions, but the interface must preserve these invariants:

1. A contract has one ordered sequence of adjacent periods.
2. The first period starts on the selected start date and is enabled by default.
3. An open-ended period has `endsOn = null` and is active until a later transition.
4. A toggle on date `D` splits the containing period at `D`.
5. If state changes from enabled to disabled at `D`, old enabled period ends at `D - 1 day`, new disabled period starts at `D`.
6. If state changes from disabled to enabled at `D`, old disabled period ends at `D - 1 day`, new enabled period starts at `D`.
7. Adjacent same-state periods are merged during normalization.
8. The next change reverses the state and continues indefinitely; no arbitrary 31/45-day cap is imposed on contract periods.
9. `startsOn` and `endsOn` are normalized to UTC midnight while user display uses local timezone.
10. Courier assignment belongs to the period, not to the customer globally.

### 8.2. Contract form

Client create/edit page becomes a resource page with a compact identity section and a contract calendar section. Identity contains name, nickname, phone, address/map, plan, set/group, price, notes and special features. The old default-courier select is removed. The contract section contains selected weekdays, start date, courier selector, paid/unpaid state, enabled/disabled toggle and period timeline.

For a customer who selects Monday and Tuesday, the system displays only those recurring weekdays as delivery candidates. The first selected contract day is enabled automatically. Each period receives the selected courier color as a thin line above the period. Paid/unpaid is visible as a compact status marker and is persisted with the contract period or contract payment policy according to the final domain decision.

### 8.3. Manual enable/disable behavior

Enable and Disable act on the selected date/range and selected customers/contracts. Before mutation, the UI presents a summary of affected customers, periods and future orders. A disable operation must not silently delete orders. It marks future contract-generated orders as disabled/paused according to existing order lifecycle semantics and writes an audit event.

When the user enables a contract period after a disabled range, the period boundary is inserted automatically before the enabled date. When the user disables a day after an enabled period, an enabled boundary is inserted before the disabled day. This prevents overlapping and ambiguous periods.

### 8.4. Per-order override

If a customer has a disabled period containing a generated order, that order is disabled by contract state. If the administrator manually enables one specific order on date `D`, the order receives an explicit override and the customer calendar shows `D` as a one-day enabled exception. The system must automatically create disabled effective days before/after that one-day override only in the order schedule projection; it must not corrupt the base contract period. This distinction requires an additive `OrderScheduleOverride` or equivalent projection record.

The order list for the customer and the courier list must use the same effective schedule resolver:

```ts
resolveEffectiveDeliveryState({ contractPeriods, weekdayRules, orderOverrides, date })
```

The resolver returns enabled/disabled, courier, payment state, source (`contract`, `order-override`, `manual`) and reason. It is pure and heavily tested.

## 9. Courier and low-admin disable/reassignment workflow

Disabling a courier or low admin for a selected day/range is a multi-step operation because assigned future orders must not be lost. The flow is a dedicated selected-couriers page with a back arrow in the upper-left and Save in the upper-right.

The page has two columns. The left column lists orders belonging to disabled courier/admin for the selected day/range. The right column lists enabled replacement couriers. The user can drag one or multiple orders to a replacement courier. The same replacement may receive multiple orders. Each move is represented as a draft assignment; no database write occurs until Save.

Save is enabled only when every affected order is assigned to an enabled replacement courier or the user explicitly cancels the disable operation. If at least one order remains on the disabled courier, Save shows a validation error and does not partially mutate. Cancel returns to the selected-couriers page and leaves the courier in the disabled selection as requested. After Save, that courier disappears from the pending-disable list; after Cancel, it remains visible.

For multiple selected couriers, the first click opens the selected-couriers page. The user can process one courier at a time. The selection registry persists across the page. Save removes only successfully processed couriers; Back/Cancel retains them. All assignments are performed in a transaction or idempotent server workflow with audit events for each changed order.

Required API semantics:

- `POST /api/admin/couriers/disable-preview`: returns affected orders, conflicts, replacements and counts.
- `POST /api/admin/couriers/disable-commit`: accepts a validated assignment map and expected version/hash.
- `POST /api/admin/couriers/disable-cancel`: no data mutation; only closes draft UI.
- Existing courier/order endpoints remain compatible.

## 10. Resource-specific pages and universal actions

### 10.1. Orders

Orders page keeps current food-delivery lifecycle and payment fields. Order number opens a full detail page/sheet containing customer summary, transactions, derived/real contract projection, actions/timeline, courier assignment, payment state, overrides and related orders. Enable/disable operates on selected dates/orders only after an explicit scope preview. Trash uses existing soft-delete semantics.

### 10.2. Clients

Clients page displays compact rows without requiring a visible table heading for the create-row mode, as in the user’s description. Create mode adds a single expandable create row. After save, the row becomes a normal selectable resource row. Edit mode opens a selected-client page where one client can be chosen, changed, saved or left with Back. Client detail includes ledger, contracts, actions, related orders and effective calendar.

### 10.3. Admins and Couriers

Admins page is the all-admin resource; Couriers is a filtered role-specific page. LOW admins and couriers share enable/disable/reassignment safety rules but retain role-specific permissions. A non-super admin must not see or modify another group’s resources. Admin detail shows transactions, employment-like contract projection or persisted contract, action logs and related courier orders.

### 10.4. Ingredients and shopping items

Ingredients page keeps CRUD and current stock. It adds enabled/disabled price-source state and links to purchase-list items. No fuzzy match may silently update a warehouse item when more than one candidate is plausible. Case-insensitive exact match is deterministic; fuzzy match requires one high-confidence candidate or a user selection.

### 10.5. Cooking, Dishes, Groups, Sets

Cooking keeps date-scoped menu planning, quantity matrix, cooked/remaining stats and existing 31/45-day calculation limits where they are domain limits. Contract calendar’s indefinite periods must not be confused with cooking calculation limits. Dishes, Groups and Sets receive the same create/edit/trash/enable command grammar without changing their JSON configuration contract unless a migration is explicitly required.

### 10.6. Transactions

Transactions page is separated from Finance summary. It supports search, date/category/type filters, selected-resource detail, audit metadata and safe editing only for transaction types that existing business rules permit. Financial mutations require explicit confirmation, server-side role check, idempotency key and success/error toast.

## 11. Finance redesign

Finance becomes a selected-resource ledger workspace rather than a summary card collection. The layout is:

1. Compact resource toolbar with Search, date range, category filter, refresh and selection count.
2. Company balance strip with current funds, customer debt, customer prepayment and salary exposure.
3. Client ledger index: customer, balance, latest transaction, active contract/payment state.
4. Admin salary ledger index: admin, role, balance, days/pay period, latest salary transaction.
5. Selected resource detail: real transactions, contract/payment projection, related orders, action history and allowed mutations.
6. Transaction action zone with create company adjustment, purchase, salary and customer balance actions.

Finance must preserve every existing mutation route. New customer IDs in history response remain additive. Virtual cards require an explicit model only if the current domain actually needs persistence:

```prisma
model VirtualCard {
  id          String @id @default(cuid())
  ownerType   VirtualCardOwnerType
  customerId  String?
  adminId     String?
  label       String
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

If a separate `VirtualCardTransaction` model is not needed, `Transaction` may receive a nullable `virtualCardId` through an additive migration. The final decision must be based on actual use cases, not on visually copying a reference card.

## 12. Warehouse and AI shopping-list workflow

Warehouse must have large resource panes for Cooking, Sets, Inventory and Calculator. Inventory summary always shows total items, zero-stock items and total quantity. Stock rows show out-of-stock state without inventing a unit-specific low-stock threshold. Purchase and calculator flows continue to use existing APIs and validation.

### 12.1. Shopping-list records

The AI purchase list is a draft resource collection. Recommended model:

```prisma
model PurchaseListItem {
  id                String @id @default(cuid())
  name              String
  quantityKg        Float
  pricePerKg        Float
  enabledForPricing Boolean @default(false)
  status            PurchaseItemStatus @default(DRAFT)
  matchedItemId     String?
  source            String @default("MANUAL")
  confidence        Float?
  createdBy         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

The list supports Create, Edit, Delete/Trash, Enable, Disable and Confirm/Reject in the bottom action zone. Confirm writes only after every selected item has valid name, positive kilogram quantity, non-negative price, valid unit conversion and a resolved match or explicit user decision. Reject discards the draft list without changing inventory prices.

When an item is enabled, its price may update the matching warehouse ingredient only after deterministic matching or user confirmation. Matching ignores case and trims whitespace. It can support normalized aliases, but similar-name fuzzy matching must show the candidate and confidence. If two ingredients are similarly plausible, the system blocks automatic application and asks the user to select. Disabled list items remain in the purchase list but never influence base warehouse prices.

### 12.2. Real-time AI audio workflow

The user flow is:

1. Key + Real-time AI opens a recording page.
2. Start begins browser microphone capture after explicit permission.
3. Stop ends capture and freezes the recording.
4. A loading state uploads/transcribes/processes the audio server-side.
5. The server calls the currently available multimodal model discovered from the configured catalog. The plan must not hardcode an unavailable model name such as an old “Gemini 3.5 Flash” label; at implementation time the supported Google multimodal model is selected from the live catalog.
6. The prompt includes the normalized ingredient-price reference list, explicit instruction not to invent products, and strict JSON schema.
7. The response is parsed and validated server-side.
8. The UI renders each item as a compact block: product name, kilograms, price, match candidate and confidence.
9. User can select multiple items, Edit one from the selected-items page, Delete items, Create manual items, Enable/Disable price influence, Confirm or Reject.
10. Confirm persists the draft purchase list and applies only confirmed price updates; Reject leaves the database unchanged.

The structured output must reject unknown fields, negative quantities, invalid prices, empty names and unbounded arrays. The model may return `unmatched` rather than guessing. Audio should be stored temporarily or through the project’s approved file storage path; raw audio must not be placed in the database. The server must never expose provider credentials to the browser.

The user requested Gemini-style audio understanding, but the implementation must follow the project’s actual configured provider/catalog and server helper. If the production environment does not expose audio-capable multimodal input, the plan must fall back to server-side transcription plus structured extraction instead of pretending that unsupported audio input works.

## 13. Chat, Settings and Database pages

Chat becomes a real main page with conversation list, selected conversation, unread state, message timeline and resource-triggered notifications. Contract changes, courier disable conflicts, SMS auto-send changes, purchase confirmation and AI extraction completion can create system messages. Messages must not contain secrets or full database dumps.

Settings becomes a right-side page with theme, RU/UZ language, feature toggles, notification preferences, auto-SMS state and permission-visible settings. Save and Back are explicit. Unsaved changes show a concise confirmation before leaving.

Database becomes a right-side/standalone resource page, retaining existing snapshot/import/export behavior. It must show scope, counts, date ranges, dry-run/preview where available, validation errors and destructive confirmation. The database page must not reset Neon or production data as part of UI work.

## 14. Auto-SMS semantics and safeguards

The user described two related behaviors: manual SMS to selected clients and automatic SMS mode. They must be represented separately:

- **Manual SMS:** with key off, SMS sends only to explicitly selected eligible clients after preview and confirmation.
- **Auto SMS:** Key + SMS toggles the persistent auto-send setting. Green means auto-send is armed; red means disabled. Disabling auto-send creates a system message in Chat confirming the change.
- **Contract notifications:** enabled contract weekdays and courier assignments generate notifications only when the effective contract resolver says the period is enabled. Disabled periods produce no courier notification and no courier order inclusion.
- **Failure handling:** partial provider failure produces per-recipient status and retry-safe IDs; it must not silently report all messages as sent.

No SMS action should be available in observation mode. Provider credentials, phone lists and message payloads must not be logged in plaintext.

## 15. Prisma and migration strategy

The current schema contains Customer, Order, OrderAuditEvent, ActionLog, InterfaceConfig, Transaction, WarehouseItem, Dish, MenuSet and related resources, but no persisted Contract, VirtualCard or PurchaseListItem model. The requested feature therefore needs a deliberate data-model decision rather than more derived UI-only objects.

Migration order:

1. Back up and inspect the current production schema; do not reset.
2. Add contract tables and indexes in a backward-compatible migration.
3. Backfill one initial contract/period only where existing customer delivery data can be mapped deterministically. Ambiguous customers remain unmigrated and are shown in an admin review queue.
4. Add order schedule override and/or effective schedule projection only after contract resolver tests pass.
5. Add purchase list and optional virtual card tables only when their UI workflow is implemented in the same release.
6. Add audit event types or generic action-log entries for enable/disable, reassignment, price application, AI confirmation and SMS setting changes.
7. Verify Prisma generated client, migration SQL, indexes, foreign keys and rollback/forward recovery.

All date indexes must support customer/contract/date and courier/date queries. Do not put database schema push inside Vercel build.

## 16. API contract plan

New endpoints should be small and resource-scoped. Existing endpoints remain intact.

| Endpoint family | Purpose | Required guarantees |
|---|---|---|
| `/api/admin/workspace/state` | restore page/mode/query context if persisted | role-scoped, no business mutation |
| `/api/admin/contracts` | list/create/update contract and periods | group scope, period invariants, audit |
| `/api/admin/contracts/:id/calendar` | read effective calendar | customer/group scope, UTC-safe range |
| `/api/admin/contracts/:id/transition` | enable/disable at date/range | idempotency, preview, transaction, audit |
| `/api/admin/orders/:id/override` | one-order enable/disable override | owner/courier scope, no schedule corruption |
| `/api/admin/couriers/disable-preview` | resolve affected orders | read-only, conflict list |
| `/api/admin/couriers/disable-commit` | reassign and disable | all-or-nothing validation, idempotency |
| `/api/admin/purchase-list` | draft shopping items | validation, owner scope, no price write before confirm |
| `/api/admin/purchase-list/confirm` | apply confirmed list/price updates | explicit confirmation, deterministic matching, audit |
| `/api/admin/ai/purchase-audio` | transcribe/extract audio | auth, size/type/rate limits, strict JSON, no provider key exposure |
| `/api/admin/sms/preview` | show recipients and message scope | no send, scope and eligibility |
| `/api/admin/sms/send` | send selected messages | confirmation, idempotency, per-recipient result |
| `/api/admin/sms/settings` | toggle auto-SMS | role check, audit, Chat system message |
| `/api/admin/resource-details` | existing common disclosures | active-only, group scope, derived contract labels |

Every mutation returns a stable result object with `success`, affected count, rejected/conflicted items and an audit identifier. Validation uses bounded schemas; unknown fields are rejected to prevent mass assignment.

## 17. TDD implementation order

Implementation must proceed in vertical slices, not by writing all tests at the end. Each slice starts with one public seam and one failing behavior test.

### Slice A: command state

Write pure reducer tests for key armed/unarmed, command entry, mode exit, invalid command and selection preservation. Implement `UniversalCommandController`, then add keyboard/pointer component tests.

### Slice B: selection registry

Test selection across normal → trash → edit → back, partial save and cancel. Implement registry and connect one existing resource, initially Clients.

### Slice C: Search/calendar/filter

Test draft/apply/clear/close semantics, AND filters, column key status and UTC day normalization. Implement standalone pages and connect Orders, Clients and Warehouse.

### Slice D: shell/navigation

Browser test top header, right-side Chat/Settings/Database, desktop right-aligned bottom panel, mobile fixed panel, deep links and focus return.

### Slice E: contracts

Pure tests for period splitting, merging, adjacent boundaries, infinite renewal, courier color, payment state and effective schedule. API tests for scope, idempotency and conflict. Browser test create/edit client contract calendar.

### Slice F: courier disable/reassignment

Pure tests for all-orders-assigned invariant, multi-courier selection, save removal, cancel retention and duplicate assignment rejection. Browser test drag/reassign/save/cancel.

### Slice G: order overrides and notifications

Test disabled period order suppression, single-order enable exception, future/past day rules and courier list projection. Test Chat system notification and no-notification disabled state.

### Slice H: Finance and virtual cards

Test ledger filters, transaction-to-client drilldown, selected resource edit/cancel, confirm/idempotency and optional card linkage. Browser test real transaction flow with fixture cleanup.

### Slice I: Warehouse and purchase list

Test inventory summary, out-of-stock state, manual create/edit/delete, AI draft validation, deterministic matching, ambiguous match block and confirm/reject persistence.

### Slice J: AI audio

Test upload size/type, transcript/extraction schema, no-guessing behavior, malformed model output, retry, cancel and human confirmation. Browser test with a deterministic provider stub or fixture; never depend on live AI quality for the core functional test.

### Slice K: SMS and observation

Test preview-before-send, recipient scope, auto-SMS toggle, system message and observation-mode disabled actions.

## 18. Security and privacy checklist

- Every ID-based read and write uses role and group scope on the server.
- Soft-deleted records are excluded from active details and normal lists.
- Contract calendars disclose only customers/couriers visible to the current administrator.
- Courier reassignment rejects disabled or out-of-scope replacement couriers.
- AI audio requires authenticated admin access, bounded content length, content-type validation, rate limit and temporary storage cleanup.
- Audio, transcript, ingredient price context and AI output are not logged in full.
- Provider/API keys exist only server-side.
- SMS phone recipients are not written into general logs.
- Purchase price updates require explicit confirmation and audit record.
- No generic database write route may be called from universal UI without existing authorization.
- Observation mode is UX read-only only; server authorization remains mandatory.
- Import/export/snapshot flows preserve existing redaction and scope behavior.

## 19. Performance, reliability and accessibility targets

| Area | Target |
|---|---|
| Resource list | Initial payload paginated/bounded; no unbounded all-resource fetch for large tables |
| Selection | Local reducer updates without refetch; reconcile only visible IDs |
| Calendar | Range queries bounded and indexed; no client generation of unbounded future orders |
| Detail sheet | Abort stale requests; one shared renderer; no duplicate transaction fetches |
| AI | Upload size limit, timeout, retry budget, model output cap and cleanup |
| Mutations | Idempotency key for finance, contract transition, reassignment, SMS and confirm |
| Reliability | `/api/health/ready`, error toasts, audit identifiers, rollback or all-or-nothing semantics |
| Accessibility | keyboard reachability, visible focus, semantic labels, Escape/Back, aria-live for selection/results |
| Responsive | no horizontal overflow except intentional table scroll; bottom panel never covers save/cancel |
| Motion | minimal, under 300 ms, `prefers-reduced-motion` respected |
| Localization | RU/UZ labels, date/number/currency locale formatting, no new hardcoded English/Russian strings |

## 20. Browser acceptance matrix

The browser matrix must be executed against a local staging database with deterministic fixtures and then against authenticated Vercel production for read-only smoke.

| Scenario | Desktop | Mobile | Expected result |
|---|:---:|:---:|---|
| RU ↔ UZ single-click toggle | ✓ | ✓ | whole admin UI changes language; no English option |
| Top header opens Chat | ✓ | ✓ | right-side page, back returns to same page/selection |
| Top header opens Settings | ✓ | ✓ | explicit Save/Back; unsaved warning |
| Top header opens Database | ✓ | ✓ | existing snapshot/import/export remains functional |
| Left page-navigation panel | ✓ | ✓ | all 15 page buttons remain in the left navigation rail |
| Top universal command panel | ✓ | ✓ | all 8 universal buttons plus key remain above the workspace |
| Bottom page-local action panel | ✓ | ✓ | Back/Clear/Cancel left; Save/Apply/Confirm right; no universal commands |
| Universal panel separated from page navigation | ✓ | ✓ | no duplicated command rail and no accidental action mixing |
| Local action panel fixed on mobile | — | ✓ | no overlap with action/footer content |
| Search → Calendar → Filter → Save | ✓ | ✓ | branch applies; Cancel/X preserves prior query |
| Filter key/column status | ✓ | ✓ | red/green status and correct exact-column filtering |
| Client create/edit contract | ✓ | ✓ | courier assigned per period, paid state, first day enabled |
| Contract enable/disable split | ✓ | ✓ | adjacent periods, no overlap, indefinite continuation |
| Disabled period suppresses courier orders | ✓ | ✓ | no courier notification/order inclusion |
| One-order enable override | ✓ | ✓ | calendar exception; surrounding schedule remains correct |
| Courier disable preview/reassign/save | ✓ | ✓ | Save blocked until all orders reassigned |
| Courier disable cancel | ✓ | ✓ | no mutation; selected courier remains |
| Multi-courier processing | ✓ | ✓ | selection survives selected-courier page |
| Order disclosure | ✓ | ✓ | transactions, contracts/projections, actions, related records |
| Client disclosure | ✓ | ✓ | transactions, contract, related orders, actions |
| Admin disclosure | ✓ | ✓ | transactions, employment projection, related orders, actions |
| Finance ledger and card/resource flow | ✓ | ✓ | filters, details, safe confirm, no lost mutations |
| Warehouse inventory | ✓ | ✓ | summary, stock status, CRUD, purchase flow |
| AI audio extraction | ✓ | ✓ | strict blocks, edit/delete/create, confirm/reject |
| Auto-SMS | ✓ | ✓ | preview, toggle, Chat system message, no duplicate sends |
| Observation mode | ✓ | ✓ | UI is read-only until key + AI exit |

## 21. Delivery phases and no-stop execution order

1. **Specification lock:** save this plan, normalize ambiguous wording, identify attachment truncation points, and define all public seams.
2. **Reference re-audit:** inspect `MainActivity`, unified buttons/tables, Finance, transactions, contracts, calendar, backup and reports source; record direct mapping to AutoFood.
3. **Architecture:** implement pure mode reducer, selection registry, resource adapter and date/period resolver interfaces before changing all screens.
4. **Schema foundation:** add contract/period and required override/audit models only after backup and migration review; generate Prisma client; do not reset database.
5. **Shell:** replace page-specific navigation with top header, right-side pages and universal bottom panel; preserve deep links and role-visible pages.
6. **Search/filter/calendar:** migrate one resource at a time, beginning with Clients and Orders, then Finance/Warehouse/Ingredients.
7. **Resource pages:** introduce the 15-page registry and route/page mapping; preserve existing feature components behind adapters where rewrite is unnecessary.
8. **Client contracts:** implement create/edit calendar, period splitting, courier-per-period and paid/unpaid state.
9. **Effective orders:** connect contract resolver, per-order overrides, customer order list and courier order list.
10. **Courier/low-admin workflow:** implement preview, drag reassignment, all-or-nothing save, cancel and multi-selection.
11. **Finance:** selected resource ledger, transactions, contract/payment detail and optional virtual-card persistence.
12. **Warehouse:** flat resource panes, purchase list, price matching and calculator/cooking integration.
13. **AI:** audio recording, server processing, strict structured output, edit/delete/create and confirm/reject.
14. **Chat/Settings/Database:** move into right-side pages with explicit navigation/save semantics.
15. **SMS/observation/localization:** complete safety controls, Chat events, RU/UZ and accessibility.
16. **Verification:** targeted tests after every slice, then full unit/integration/build/Playwright, security review and browser visual inspection.
17. **Rollout:** inspect diff/secret scan, create one cohesive final commit only after all acceptance criteria pass, push non-force to `FreedoomForm/ok:main`, wait for Vercel Ready, perform authenticated production read-only smoke.
18. **Final message:** report only after the complete implementation, checks, push and rollout are finished. Clearly distinguish persisted contracts from derived projections and list any explicitly deferred feature with reason.

## 22. Definition of 100% completion

The work is not complete if only the bottom bar, colors, cards or selected detail sheets are changed. It is complete only when all of the following are true:

- All 15 primary pages are reachable through the **left page-navigation panel** and have the universal command grammar.
- All eight universal buttons and the key are rendered in the **top universal command panel**, work contextually and safely, and have visible status.
- Back, Clear, Cancel, Save, Apply and Confirm are rendered in the **bottom page-local panel** and never replace or duplicate universal commands.
- The eight modes preserve selection and have explicit save/back/cancel semantics.
- Search opens the reference-style surface with separate calendar and filter pages.
- Filter columns have key status, visibility control and correct AND semantics.
- Client contracts have persistent periods, per-period courier, paid/unpaid state, recurring weekdays, enable/disable transitions and indefinite continuation.
- Effective contract state drives customer orders, courier lists and Chat notifications.
- Courier/low-admin disable cannot save until all affected orders are reassigned or the user cancels.
- Order, Client and Admin detail pages show real scoped transactions/actions/related orders and clearly labelled persisted or derived contract information.
- Finance is a real ledger/resource workspace, not only a summary section.
- Warehouse is a real resource workspace with cooking, sets, inventory, calculator and purchase-list semantics.
- AI purchase extraction is server-side, strictly validated, non-hallucinatory by design and human-confirmed before price writes.
- Chat, Settings and Database are separate navigable pages/right-side panels.
- English is removed from the user-facing language switch; RU/UZ toggle works everywhere.
- Existing AutoFood APIs, auth, role scope, customer/courier site, finance writes, order lifecycle and Vercel build remain working.
- Migration and production data safety are proven; no destructive reset occurs.
- Tests and browser acceptance matrix pass on desktop and mobile.
- Final diff is clean, secret-free, reviewed and pushed only once after completion.

## References

[1]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/MainActivity.kt "Reference shell, top/bottom navigation and lifted mode state"
[2]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/ui/components/UnifiedButton.kt "Reference universal action button grammar"
[3]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/ui/components/UnifiedTable.kt "Reference search, column filters, visibility and selection"
[4]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/FinansiPanel.kt "Reference finance resource and ledger interaction"
[5]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/TransactionListScreen.kt "Reference transaction resource page"
[6]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/ContractListScreen.kt "Reference contract resource page"
[7]: https://github.com/ozodbekasilbekov2-gif/-1/blob/297fed5/app/src/main/java/com/example/ContractCalendar.kt "Reference contract/calendar state behavior"
[8]: https://github.com/FreedoomForm/ok/tree/main "Current AutoFood target repository"


## 23. Новые обязательные уточнения пользователя (authoritative addendum)

Этот раздел добавлен по последним двум приложениям пользователя и имеет приоритет над более ранними краткими формулировками плана. В частности, он фиксирует точную пространственную иерархию интерфейса и делает Chat, client authentication и будущие client/courier sites частью одной resource architecture.

### 23.1. Не останавливаться на косметическом слое

Нельзя считать работу выполненной после изменения цветов, карточек, размеров, bottom bar или отдельных detail sheets. Каждая страница должна использовать ту же resource grammar, что и reference: единое состояние selection, единые universal commands, отдельные page-local actions, одинаковые back/save/cancel semantics, явные enabled/disabled/deleted states, action history и temporary branches. Existing AutoFood domain behavior должен быть подключён к этой grammar, а не оставлен рядом с ней как отдельный старый UI.

Во время реализации не требуется останавливать работу для промежуточного сообщения. Следующий пользовательский отчёт отправляется только после того, как весь acceptance matrix пройден, migration/build/tests/browser проверки завершены, а единый commit/push и production rollout подтверждены.

### 23.2. Три уровня расположения controls — окончательное правило

Окончательная композиция каждой унифицированной страницы:

| Уровень | Содержимое | Запрещённое смешение |
|---|---|---|
| Left page rail | Кнопки перехода на 15 основных страниц и доступные role-specific pages | Здесь не размещаются universal commands и mutation buttons |
| Top universal bar | Search, Plus/Create, Enable, Disable, Trash, Edit, SMS, Real-time AI и key | Здесь не размещаются page-local Save/Back/Cancel |
| Bottom local bar | Back, Clear, Cancel слева; Save, Apply, Confirm справа | Здесь не дублируются universal commands и page-navigation |

Chat, Settings и Database открываются из global/top area как отдельные right-side pages/panels. При этом Chat имеет собственную resource layout внутри: left page rail, затем contact rail, затем message workspace. Ни одна из этих панелей не должна уничтожать selection или draft state предыдущей страницы.

### 23.3. Chat как полноценная унифицированная resource page

Chat не является простым modal или отдельным несвязанным messenger. Это полноценная главная resource page, которая визуально подчиняется тем же правилам, что Ingredients, Clients, Orders и Finance, но имеет Telegram-like message workspace.

Слева остаётся общий page-navigation rail. Сразу рядом с ним появляется второй узкий слой **Contact rail**, в котором находятся контакты администраторов. По умолчанию сразу после создания administrator account автоматически создаётся или становится доступным специальный **System contact**. Администратор получает от System contact приветственное сообщение. Когда другой администратор пишет текущему администратору, его контакт появляется в contact rail и получает unread state.

После выбора контакта в верхней части message workspace, под верхней universal command bar, отображается profile header выбранного контакта. Header является кликабельным: переход открывает contact detail page с именем, номером, цветом, professional icon, created-at metadata, active state, action history, temporary branches и allowed edit/enable/disable/trash actions. System contact имеет системный badge и не может быть удалён обычным пользователем.

Message alignment и color semantics:

- исходящие сообщения текущего администратора отображаются справа;
- сообщения выбранного контакта отображаются слева;
- system messages отображаются с отдельным neutral/system treatment;
- цвет incoming contact messages берётся из цвета этого контакта;
- message order определяется server `createdAt`, а не локальным insertion order;
- unread state сбрасывается только при фактическом открытии контакта, а не при простом появлении его в списке;
- message composer находится внизу workspace над page-local bottom bar;
- отправка выполняется кнопкой Send или Enter, а Shift+Enter создаёт новую строку;
- закрытие/back возвращает к предыдущей page и сохраняет selected resource.

Создание контакта через universal Plus открывает create page/row с полями `name`, `phone`, `color` и `professionalIcon`. Color выбирается только из ещё не занятых цветовых оттенков; icon выбирается из заранее определённого набора профессиональных icons. Phone нормализуется до единого формата и проверяется на уникальность до Save. Если контакт с таким номером уже существует, Save блокируется и пользователь получает локальную ошибку с предложением открыть существующий контакт. Back находится внизу слева, Save — внизу справа.

Контакт можно редактировать, удалять, отключать и включать теми же universal commands, что и остальные ресурсы:

| Состояние контакта | Видимость | Может писать | Где восстанавливается |
|---|---|---:|---|
| Enabled | обычный contact rail и active mode | Да | обычный режим |
| Disabled | disabled mode, status line | Нет | Enable mode |
| Deleted | Trash mode | Да, если продуктовая политика сохраняет messaging access | Trash mode → Plus/Restore |

Deleted contact не исчезает физически: он переходит в корзину и может быть восстановлен. Disabled contact не может отправлять новые сообщения. Переход между состояниями пишется в ActionLog и сохраняет selection. Для Chat работают Action history и Temporary branch: history показывает creation, rename, phone/color/icon changes, enable/disable, delete/restore и sent/system messages; temporary branch фиксирует draft contact/message view и закрывается через X/Back без потери selection.

### 23.4. Auto-SMS — только внутренний messenger

Термин auto-SMS в этом продукте означает **автоматическую отправку сообщений через внутреннюю страницу Chat**, а не отправку настоящих SMS через телефонную сеть и не вызов внешнего SMS provider. Поэтому:

1. contract/courier/order events создают внутренние system messages в соответствующем чате;
2. auto-send не требует phone provider credentials и не должен вызывать реальный SMS API;
3. green SMS state означает включённую автоматическую генерацию внутренних сообщений;
4. при Key + SMS, если key и SMS уже green, повторный SMS переводит auto-send в red/off и создаёт system message о том, что automatic internal messages отключены;
5. если key не green, SMS действует на выбранных клиентах/контактах как manual internal-message action после preview/confirmation;
6. message delivery state означает persisted internal message state, а не external telecom delivery;
7. Chat system message создаётся idempotently, чтобы повторный job/retry не создавал дубликаты.

Все прежние формулировки о provider failure, recipient delivery и real SMS следует трактовать только как будущий extension point, не как обязательный внешний канал текущей реализации.

### 23.5. Client credentials, создаваемые администратором

При создании клиента администратор должен создавать не только профиль и contract data, но и client account credentials. По умолчанию:

- client login = normalized phone number;
- initial client password = phone number;
- password сохраняется только как secure hash, никогда не хранится и не показывается в plaintext после Save;
- admin может выполнить explicit reset password action, но не читает старый password;
- login uniqueness проверяется server-side;
- disabled/deleted client не может войти в client site;
- client auth session не получает admin permissions и не может переключать resource pages другого role;
- при первом входе может быть обязательная смена default password, если это совместимо с текущим auth flow;
- создание credentials, reset и disable/restore пишутся в audit trail.

Это plan-level interpretation неоднозначной фразы «вход клиента через login администраторов»: клиент входит в свой account через общий authentication infrastructure AutoFood, а не получает права администратора и не использует credential другого admin. Admin-managed creation/reset остаётся отдельным privileged action.

### 23.6. Унификация client и courier sites после admin workspace

После завершения admin resource workspace план продолжается вторым release track для client и courier interfaces. Они используют тот же shell contract и universal command grammar, но получают разные role-specific registries:

- client site показывает только персональные pages: profile, orders, contract/calendar, transactions/balance, messages и доступные support/settings pages;
- courier site показывает только courier pages: assigned orders, route/day calendar, messages, profile/status, availability and reassignment notices;
- admin site показывает полный resource registry и administrative mutations;
- все три sites используют тот же visual grammar: top universal bar, role-specific left page rail и bottom page-local actions;
- universal buttons остаются едиными по месту и semantics, но `canRunCommand` скрывает или disables недоступные действия;
- client/courier pages получают недостающие details, history and message flows из admin resource model, но никогда не получают чужие transactions, contracts, private admin actions или group data;
- персонализированная информация и role scope являются единственными основными различиями, кроме набора доступных страниц и специальных actions.

До начала этого track необходимо проверить, какие client/courier routes уже существуют, сохранить их URL compatibility и мигрировать их постепенно через shared shell adapters. Нельзя сначала удалять старые страницы, а затем пытаться восстановить их behavior.

### 23.7. Новые обязательные acceptance tests

К прежней browser matrix добавляются следующие проверки:

| Сценарий | Expected result |
|---|---|
| Создание admin account | System contact доступен, greeting message создан ровно один раз |
| Chat contact create | name/phone/free color/pro icon валидируются; duplicate phone блокируется |
| Chat contact message | incoming слева в contact color, outgoing справа, system message neutral |
| Disabled contact | contact виден в disabled mode, новый message composer/action недоступен |
| Deleted contact | contact виден в Trash, не уничтожен физически, restore возвращает его |
| Contact edit | selected contact page имеет Back слева и Save справа; Back сохраняет selection без mutation |
| Internal auto-SMS | contract/order event создаёт internal Chat message, внешний SMS provider не вызывается |
| Auto-SMS toggle | green→red toggle создаёт ровно один system message о выключении |
| Client creation | login и initial password равны normalized phone; password в UI/API plaintext не возвращается |
| Client login | client получает client scope, не admin scope; disabled/deleted account отклоняется |
| Three-level layout | page buttons только слева, universal buttons только сверху, local Save/Back только снизу |
| Client/courier shell | role-specific registry и same interaction grammar без cross-role data leak |

### 23.8. Definition of 100% completion — additional gates

100% completion также требует, чтобы Chat был полноценной resource page с contact rail, System contact, profile header, colored Telegram-like messages, contact CRUD/state modes и internal auto-SMS; чтобы client creation создавала secure login/password defaults; и чтобы client/courier sites были либо полностью унифицированы, либо явно не выпускались в production до завершения отдельного acceptance track. Нельзя объявлять всё завершённым, если эти части существуют только в плане или как декоративные placeholders.

## 24. Decision log для неоднозначных мест

На основании приложений пользователя зафиксированы следующие рабочие решения:

| Вопрос | Решение для реализации | Когда пересматривать |
|---|---|---|
| «Кнопки страниц снизу/слева» | Последнее уточнение имеет приоритет: page buttons слева, universal сверху, local actions снизу | Только при прямом новом указании пользователя |
| «Auto-SMS» | Внутренние Chat messages, не реальные telecom SMS | Если пользователь отдельно запросит внешний provider |
| «Client login через admin login» | Общая auth infrastructure, client account создаётся admin; client не получает admin role | Если требуется admin impersonation, нужен отдельный explicit security design |
| «Deleted contact can write» | Soft-deleted contact сохраняется с messaging access по описанной политике; это должно быть явно видно в Trash | Если нужен запрет messaging для deleted, меняется только policy/resolver |
| «Gemini 3.5 Flash» | Выбирается реально доступная server-side multimodal модель из live catalog; unsupported model name не hardcode’ится | После проверки production provider capability |

## 25. Источники последнего уточнения

[9]: /home/ubuntu/upload/pasted_content_3.txt "User clarification of universal commands, contract/calendar, modes and three-level layout"
[10]: /home/ubuntu/upload/pasted_content_4.txt "User clarification of Chat contacts, internal auto-SMS, client credentials and client/courier unification"


## 26. Addendum: unified status/calendar and finance-calculator linkage

### 26.1 Contract renewal decision
The accepted rule is **variant 1 with explicit auto-renewal**. When a contract has a defined end date and auto-renewal is enabled, the system creates the next enabled seven-day period indefinitely until an administrator changes, disables, splits, or ends the contract. Renewal must be idempotent and must not duplicate periods when the scheduler or save action is retried.

Contract periods preserve the distinction between the period itself and its day-level availability. A renewed seven-day period may contain a mixture of enabled and disabled weekdays. Disabled days do not create scheduled orders, courier workload, revenue accrual, or ingredient demand. Re-enabling a day affects only future effective scheduling unless the administrator explicitly regenerates an affected draft; historical orders and completed transactions remain immutable.

### 26.2 Universal status and calendar contract
Every managed object exposes the same state grammar: **ENABLED**, **DISABLED**, and, where lifecycle retention is supported, **DELETED/TRASH**. This applies to ingredients, sets, groups, clients, couriers, contracts, transactions, dishes, orders, virtual cards, admins, purchases, and Chat contacts. Existing role-specific `isActive`, `deletedAt`, and order status fields remain authoritative for current API contracts; the additive day-level calendar overlay must never erase historical records.

Every resource has a calendar using the same interaction rules as courier/order calendars. It lists every day in the selected date or period, shows explicit enabled/disabled lines, supports selecting a day or range, preserves resource selection, and keeps disabled days visible. Universal Enable and Disable apply to selected resource/day combinations. Save persists the draft; Cancel/Back discards only the uncommitted draft; Confirm applies the operation and preserves selection. A missing override means enabled by default.

The effective resolver is deterministic: DELETED resources remain visible in Trash and retain the explicitly approved internal messaging behavior; disabled resources remain visible in disabled mode and cannot participate in new operational work; historical orders, contracts, and transactions remain readable regardless of current state. Order generation, courier assignment, contract schedules, ingredient demand, finance projections, and calculator totals all consume the same effective availability resolver.

### 26.3 Finance resource page
Finance uses the same left-side resource rail as Chat, positioned beside the primary 15-page rail. Its secondary rail contains one expandable line per virtual card. Each line shows card name, creation date, current balance, and card color as its background. Expanding a card reveals its transactions without leaving Finance. Card selection and expansion persist across Search, Filter, Calendar, Edit, Trash, and local Save/Confirm actions.

Finance retains company/admin/client ledger behavior and adds a normalized virtual-card seam. Card status and calendar overrides use the universal state/calendar grammar. Transaction creation from a completed purchase is atomic: purchase completion, inventory update from validated rows, and selected-card transaction creation happen exactly once. Retry-safe idempotency prevents double-counting.

### 26.4 Calculator resource page
Calculator has a secondary left rail. Each line represents a purchase/calculation transaction and displays title, time/date, and amount. Expanding a line shows exact ingredients purchased, quantities, units, unit prices, and total. The main workspace displays a table containing required grams/liters/items and cost calculated from database inventory and prices.

The calculation supports one selected day or a range and joins active clients, effective contracts, enabled weekdays, selected sets, groups, dishes, ingredient recipes, and non-disabled orders. Disabled orders and disabled calendar days contribute zero demand. Missing prices or recipes appear as warnings instead of hallucinated quantities/prices. Universal Plus creates a purchase-list draft; Edit/Delete modify the draft; bottom-left Save persists it; bottom-right Finish/Confirm atomically marks the purchase bought, updates inventory, and creates the linked finance transaction.

### 26.5 Cross-resource acceptance tests
Add browser and integration coverage for individual day disable/re-enable on every supported resource type; disabled days during seven-day contract renewal; no order/ingredient/finance contribution from disabled days or disabled orders; Finance card rail rendering and expansion; Calculator transaction rail expansion; day/period calculation totals; missing-price warnings; Plus creating a purchase draft; Save persisting it; Finish creating exactly one inventory update and one linked transaction; retrying Finish without duplicates; and selection preservation across all three shell levels.
