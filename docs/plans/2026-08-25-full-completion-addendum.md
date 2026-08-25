# Addendum: полный критерий завершения переноса `-1` в AutoFood

**Дата:** 2026-08-25
**Статус:** обязательное расширение authoritative plan; этот документ не заменяет исходный план, а уточняет все места, где предыдущая реализация была недостаточной.
**Источники:** `pasted_content_3.txt`, `pasted_content_4.txt`, `pasted_content_5.txt`, требования пользователя о variant 1, исходный код reference `ozodbekasilbekov2-gif/-1` и текущий AutoFood.

## 1. Definition of Done

Работа считается завершённой только тогда, когда каждый пункт этого addendum реализован в коде, доступен в браузере для соответствующей роли, имеет server-side authorization, покрыт тестом и проверен на desktop и mobile. Наличие похожих кнопок, отдельных декоративных компонентов или успешного build не считается выполнением. Нельзя оставлять параллельную старую и новую UI-грамматику, если пользователь видит или может случайно активировать обе.

Финальный продукт должен ощущаться как web-версия `-1`, а не как текущий AutoFood с добавленным rail. Поэтому визуальные размеры, порядок, иконки, active/armed/disabled цвета, расстояния, раскрытия, нижние действия и переходы должны быть сверены с реальными reference-компонентами. Сохраняются только AutoFood-домен, REST/API/Auth.js/Prisma/PostgreSQL, роли, данные и Vercel-архитектура.

## 2. Полная информационная архитектура

Основной shell состоит из одного плоского рабочего слоя без вложенных декоративных UI-уровней. Слева находится основной resource rail. Для обычного администратора в нём доступны следующие страницы в фиксированном порядке: Chat, Settings, Ingredients, Cooking, Dishes, Groups, Sets, Finance, Contracts, Transactions, Orders, Admins, Couriers, Clients и Calculator. Отдельная 16-я страница Routes добавляется рядом с Orders в canonical registry и также участвует во всех универсальных режимах. Если Settings и Database реализуются как правые страницы/панели, Database должен быть отдельным first-class resource surface, а не скрытым случайным dialog.

Нижние page buttons из reference должны находиться в нижней части workspace. На широком экране они выравниваются справа, как в приложении пользователя; на узком экране сохраняют доступность и не перекрывают контент. Верхняя полоса содержит только key и universal commands; заголовок, пояснения и вторичные действия не должны создавать второй визуальный command layer.

| Слой | Обязательное содержимое | Недопустимое поведение |
|---|---|---|
| Основной rail | 16 resource pages, иконка, active state, role scope | скрытая дублирующая навигация, длинные текстовые вкладки вместо rail |
| Верхняя command strip | Key, Search, Plus, Enable, Disable, Trash, Edit, SMS, Real-time AI | оставление старого набора кнопок рядом с новым, неодинаковая grammar по страницам |
| Рабочая область | текущая страница, её secondary rail/таблица/календарь | несколько конкурирующих active panels, декоративные карточные слои |
| Нижняя local strip | Back, Clear, Cancel, Confirm, Save в reference placement | разные случайные кнопки для одной и той же операции, Save без draft semantics |

Старые URL и response shapes остаются совместимыми. Legacy tabs могут существовать как программный adapter/deep-link mapping, но не как видимый второй интерфейс и не как источник race condition, который возвращает пользователя с Routes/Contracts/Transactions/Calculator обратно в Orders/Finance/Warehouse.

## 3. Точная universal-command grammar

Нужно перенести не только названия и Lucide-аналоги. Для каждой кнопки следует зафиксировать reference icon, hitbox, shape, background, foreground, line weight, spacing, hover/focus behavior, disabled opacity, active state и порядок. Нельзя использовать текущий AutoFood button variant как замену, если он отличается от reference.

### 3.1 Key state

Key имеет минимум три независимые визуально различимые фазы: disarmed/normal, armed/готов к следующей команде и active-mode. После нажатия key фон меняется на зелёный. После выбора destructive или special command key и command показывают красный/green transition согласно grammar reference. Состояние key не должно самопроизвольно сбрасываться после SMS или Trash: пользователь должен явно нажать key повторно, чтобы выйти из armed state. Refresh, смена страницы и раскрытие строки не должны терять selection или незавершённый draft.

### 3.2 Command truth table

| Command | Без key | После key | Результат и ограничения |
|---|---|---|---|
| Search | открывает обычный поиск только если это разрешено reference | включает search/temporary-branch режим | раскрывающаяся круглая кнопка; внутри отдельные Calendar и Filter windows |
| Plus | page-local create только в безопасном normal flow | universal create mode | создаёт сущность текущей страницы; в Trash восстанавливает selected rows; в Calculator создаёт purchase list; в Routes/Cooking открывает draft |
| Enable | обычный local action или недоступен без selection | enabled mode | выбранные resource/day/range становятся enabled после Confirm/Save |
| Disable | обычный local action или недоступен без selection | disabled mode | выбранные resource/day/range становятся disabled; courier/admin disable требует reassignment guard |
| Trash | не должен мгновенно удалять | trash mode | показывает soft-deleted rows, сохраняет normal selection; Plus восстанавливает, не очищая selection |
| Edit | page-local edit для single selection | multi-resource edit mode | сначала экран selected elements, затем detail выбранного элемента, Back сохраняет selection, Save фиксирует изменение |
| SMS | internal message выбранным контактам | toggles internal auto-SMS | только persisted Chat messages; никакого telecom/SMS provider; после disable приходит System notification |
| Real-time AI | не мутирует данные | observation/AI flow | голосовая запись или текстовый fallback, strict grounded suggestion, обязательное ручное подтверждение |

### 3.3 Universal creation and selected-elements pages

Universal Plus должен вести на единый create surface текущей страницы. В нём есть раскрывающаяся строка создания, поля сущности и повторное Plus/Save для добавления новой строки. После сохранения созданная сущность превращается в обычную compact row без лишних заголовков колонок, остаётся selectable и участвует в Edit/Delete/Enable/Disable/Trash.

Universal Edit при множественном выборе сначала показывает страницу выбранных элементов. Пользователь выбирает один элемент, редактирует его и возвращается к списку выбранных. Save оставляет элемент selected; Back/Cancel удаляет его из selection только по явно заданному reference правилу. То же правило применяется к couriers, orders, contracts, clients, virtual cards, transactions, low admins, ingredients, dishes, groups, sets, routes и cooking records.

## 4. Единая resource state model

Каждая управляемая сущность должна иметь adapter с единым контрактом: `list`, `detail`, `search`, `filter`, `select`, `create`, `edit`, `softDelete`, `restore`, `enable`, `disable`, `calendar`, `history` и `scope`. Adapter возвращает UI-ready rows, но server остаётся источником истины. Нельзя имитировать работу universal commands только локальным state.

Обязательные resource kinds: INGREDIENT, COOKING_RECORD, DISH, GROUP, SET, CLIENT, COURIER, ADMIN, CONTRACT, CONTRACT_PERIOD, ORDER, ROUTE, ROUTE_STOP, VIRTUAL_CARD, TRANSACTION, PURCHASE, CHAT_CONTACT, CHAT_MESSAGE, SETTINGS и DATABASE/operational configuration.

Для каждого ресурса сохраняются отдельные понятия:

1. **enabled/disabled lifecycle state** — участвует ли сущность в новых операциях;
2. **deleted/trash state** — soft-deleted сущность остаётся в базе и доступна в Trash;
3. **day-level availability override** — active или disabled в конкретную дату;
4. **historical record state** — завершённый order/transaction/purchase нельзя уничтожить изменением текущего состояния;
5. **audit/history state** — кто, когда и каким command изменил запись.

`isActive`, `status`, `deletedAt` и legacy order states можно сохранять для backward compatibility, но UI и новые сервисы обязаны проходить через один effective resolver. Default без override — enabled. Disabled не удаляется, не исчезает из disabled mode и не участвует в новых operational calculations. Deleted виден в Trash и может быть восстановлен. Исторические записи остаются readable независимо от текущего enabled state.

## 5. Универсальные календари и effective data

Каждый ресурс имеет календарь по той же логике, что courier/order calendar. Calendar panel должен показывать выбранный день или range, все explicit enabled/disabled dates, цвет состояния, source of override и affected downstream records. Дни нельзя скрывать после disable. Кнопки Enable/Disable действуют на selected resource/day/range, а не только на глобальный `isActive`.

Effective resolver должен использоваться в одном направлении во всех слоях:

`availability(resource, date) -> contracts/clients/couriers/orders/routes -> sets/groups/dishes -> recipes/ingredients -> calculator/purchases/finance projections -> Chat notifications`.

Изменение состояния дня влияет на будущую effective schedule. Исторические orders, delivered results, paid transactions и completed purchases не пересчитываются без отдельного explicit regeneration flow. Если клиент, контракт, order, courier, dish, set, group или ingredient disabled на день, соответствующий future demand/workload/revenue/ingredient quantity равен нулю.

Изменение зависимости должно инвалидировать или пересчитывать только допустимый future scope. Например, disable order не должен переписывать историю Finance; disable ingredient не должен молча менять старые purchases; disable client day должен убрать только future order demand для этого дня.

## 6. Contracts, clients, couriers и orders

Создание/редактирование клиента больше не должно содержать старый произвольный courier selector. Courier выбирается внутри contract period. В contract editor пользователь выбирает weekdays, courier, paid/unpaid state, start/end period, auto-renewal и calendar overrides. Первый день периода enabled и визуально выделен цветом courier. Над каждым contract period отображается цветовая линия assigned courier.

Variant 1 фиксируется так: при explicit `autoRenew=true` после окончания периода создаётся следующий независимый семидневный period; renewal продолжается indefinitely, пока администратор не выключит auto-renew, не изменит/разделит period или явно не завершит contract. Каждый week — новая запись, не бесконечное продление одной строки. Renewal idempotent при повторном scheduler request, manual Save, retry и конкурентных calls.

Если внутри enabled period выбран disabled day, этот день и все downstream orders/workload/revenue/ingredient demand отключаются. Если позже появляется enabled day, перед ним фиксируется граница disabled period; если enabled day затем отключается, перед ним фиксируется граница enabled period. Периоды считаются действующими до противоположного изменения, без скрытого автоматического возврата состояния.

Orders не получают обязательное time input при создании. Delivery time остаётся nullable legacy field для старых данных, но новая route/order grammar использует selected day, contract availability, route position и courier assignment.

Disable отдельного order в день включает именно день order calendar; прошлые и будущие даты автоматически disabled только по утверждённому rule, без уничтожения historical record. Disable клиента/контракта исключает связанные future orders из courier list, Chat notifications, calculator totals и scheduler output.

Disable courier или LOW_ADMIN требует migration/reassignment screen. Слева показываются affected orders выбранного дня/range, справа — enabled couriers/admins. Пользователь перетаскивает один или несколько orders к одному courier или распределяет их между несколькими. Save доступен только если у отключаемого courier не осталось affected future orders. Cancel возвращает пользователя к selected couriers и не меняет данные. Для нескольких couriers после Save сохранённый courier исчезает из списка disable candidates; после Cancel остаётся видимым.

После назначения contract courier получает internal Chat notification с contract, date/range, days, orders и status. Карту и список courier orders нужно строить из effective assignment contract period, а не из default super-admin fallback.

## 7. Chat resource

Chat имеет тот же основной rail и отдельный secondary contact rail. Contact row показывает имя, color, icon, lifecycle state и unread/last-message metadata. По умолчанию System contact создаётся ровно один раз, а после создания administrator account получает welcome message. System защищён от edit/delete/disable и служит источником internal notifications.

Сообщения пользователя показываются справа, сообщения контакта — слева, с цветом выбранного contact window в Telegram-подобной compact grammar. Header profile/message summary можно открыть для contact details, creation moment, lifecycle and actions. Disabled contact не может писать administrator; administrator может читать историю и включить его обратно. Deleted contact находится в Trash, но по явному правилу всё ещё может писать; его сообщения не удаляются. Restore возвращает contact из Trash.

Create contact form содержит name, phone, random selectable color-square row без повторяющегося текста вместо swatches и professional icon selector. Если phone не соответствует existing user, система сообщает об этом и не создаёт ложную external account. Save и Back находятся в нужных нижних углах. Edit/delete/enable/disable используют universal selected-element flow. Auto-SMS — только batch persisted internal Chat messages с report skipped disabled recipients; provider SMS не вызывается.

## 8. Finance

Finance должен быть полноценной resource page рядом с основным rail. Его secondary rail располагается рядом с primary resource rail и содержит строку каждой virtual card: name, creation date, balance и background color card. Строка expandable; expansion показывает только transactions выбранной card с date, amount, title, status и linked purchase/order. Card rail selection, expansion и draft state сохраняются между Search, Filter, Calendar, Edit, Trash и local actions.

Virtual cards имеют enabled/disabled/trash state и day-level calendar. Disabled card нельзя выбрать для новой purchase/transaction. Existing historical transactions читаются. Manual ledger transaction должен позволять выбрать card в пределах owner scope; cross-scope card ids отклоняются server-side.

Finish purchase должен atomic transaction-ом выполнить validated purchase completion, one card debit, inventory increment/decrement according to domain contract, linked transaction creation, ActionLog и status transition. Retry and concurrent completion produce one effect only. Insufficient balance, disabled card, unavailable ingredient, malformed price and stale draft return safe error without partial mutation.

## 9. Calculator

Calculator имеет secondary history rail рядом с main workspace. Каждая history line показывает title, time, date и amount. Expansion показывает purchased ingredients, quantity, unit, unit price, linked card and transaction. History rows можно открыть, редактировать или удалить только через valid lifecycle rules.

Main table обязательно вычисляет из database context: grams/liters/items required, unit, current inventory, price source, cost, warnings and affected clients/contracts/sets/groups/dishes/orders. Supports selected date and bounded date range. Calculation joins active clients, effective contract periods, weekdays, selected menu sets, groups, chosen dishes, recipes and non-disabled orders. Disabled order/day contributes exactly zero. Missing recipe/price is visible warning; no silent guessing.

Plus creates a purchase-list draft with title, selected date/range, rows, custom rows and selected virtual card. Edit changes a row and keeps selection according to selected-elements rules. Delete removes the row from draft, not historical completed purchase. Bottom-left Save persists `DRAFT`; bottom-right Finish/Confirm completes all items and creates one linked Finance transaction. Embedded Warehouse “Buy selected” must be removed or adapted to the same source of truth so there is no duplicate immediate-buy path.

## 10. Routes

Routes is the 16th resource page. Its secondary rail has one line per courier with courier name, professional icon, selected/random color and expandable route records. Main mini-header has Previous on the left, current selected day/range in the center and Continue on the right. Default range is current day through next Monday inclusive according to local calendar semantics.

The map area shows current-day orders as compact squares containing first initial of client surname and first initial of client name. A route row on the right shows courier initials, route name, colored background and ordered square stops. Expansion shows all orders and supports reorder from first to ninth position. Route create opens from universal Plus: name, courier, color-square selection and selected orders.

Route editing can draw a courier-colored translucent rectangle/selection boundary on the operational map, associate orders inside it with one route, preserve road/order optimization for Tashkent and recalculate order when a stop moves. Every calendar week creates a new route record. Disabling a route excludes it from automatic future weeks while preserving past routes; enabling affects future effective routing. New orders in future weeks are included only when they fall within an enabled route boundary and valid courier/contract availability. Routes remain linked to contract, courier, order, client and Chat notifications.

## 11. Cooking

Cooking Plus opens a preparation page for the selected date. It lists dishes from the database for that day and allows `minus / numeric input / plus` next to each dish. Clicking a dish expands its ingredient rows. Each ingredient row has the same minus/input/plus controls for actual grams or liters consumed, prefilled from effective set/group/order calculation but manually correctable.

The page must show which client, contract, set, group and order caused each requirement. Disabled clients, contracts, days and orders are excluded. A random color-square row selects the cooking-record color before Save. Bottom-left Back cancels the draft; bottom-right Save creates a persistent cooking record visible in the cooking secondary rail. Edit/Delete/Enable/Disable apply to cooking records with the universal selection state. Existing cook/inventory deduction action remains explicit and cannot occur merely by opening or saving a preparation draft.

## 12. Real-time AI and audio purchase flow

Real-time AI opens a dedicated observation/purchase assistant flow. Where browser permission exists, the page exposes Record and Stop; after Stop, Next sends the captured audio to a server-side transcription/multimodal seam. If raw audio provider is unavailable, UI must state that clearly and offer text/transcript input rather than pretending that audio was parsed. Provider/model selection must be capability-verified at runtime; no unsupported hardcoded model name.

The server sends inventory names, units and trusted Tashkent prices as context, asks for strict JSON and parses/validates the response. Grounding is case-insensitive but must not accept unknown products, unsupported units, invented prices, impossible quantities or malformed JSON. The result is a list of editable blocks: product, quantity kilograms/units, unit price, total, matched inventory item, confidence/warning. The AI endpoint never mutates inventory, finance or ingredients.

User can select rows, Edit one row, Delete a row, Plus create a row, Enable/Disable whether a suggested price is allowed to influence current ingredient price, and then Confirm/Finish. Only explicit human confirmation can write a purchase draft or complete a purchase. Enabled matching purchase rows may update the current ingredient price only through a separate auditable, normalized-name matching operation; disabled rows never influence base ingredient prices.

Observation mode is a hard UI lock: after key + Real-time AI, the site is readable but no other button, link, form or mutation works until key + Real-time AI exits the mode. Selection and uncommitted AI draft survive loading and row edits.

## 13. Client and courier shell unification

Client and courier portals must use the same flat three-level grammar: role-visible resource rail, same universal command positions/icons/states, and bottom local actions. Their page registry is a subset with personalized data, not a separate visual language. Client sees only own contracts/orders/transactions/messages/calendar; courier sees assigned routes/orders/contracts and Chat notifications. Server scope checks remain authoritative; hiding a page is not authorization.

Neither client nor courier can access admin resources or mutate another user’s data. Customer login is phone as login and normalized phone as initial password; only hash is stored and no plaintext is returned. RU/UZ is the only language toggle; English is removed from user-facing selector and fallback copy. Theme remains available without reintroducing a second UI layer.

## 14. Visual acceptance contract

The previous gold/white/black neobrutalist surface is not acceptable as the final reference transfer. Main light theme uses the reference paper/card hierarchy and flat surfaces. Borders are absent or transparent except for focus/selection/status affordances. Heavy shadows, glass, 3D transforms, glow animations, oversized rounded cards, decorative gradients and duplicated headers are removed from high-traffic resource screens. Content, icon and compact line layout carry hierarchy.

Universal command buttons must be redesigned from the reference source, not merely recolored existing AutoFood buttons. Each icon’s order, size, hit area, shape, line style, active green/red state and disabled state is tested by screenshot/DOM assertions. Random color selection is rendered as a compact row of colored squares in every location where the plan requests a color: chat contacts, cards/routes/couriers/cooking records, contract period marker and purchase price influence. Random means a deterministic safe choice is generated from an allowed palette and persisted after Save; it must not change on every render.

## 15. Backend and database requirements

All new tables use additive migrations and explicit indexes/unique constraints. Required relation integrity includes client-contract-period-courier-order-route-stop, set-group-dish-ingredient, purchase-purchase-item-virtual-card-transaction, chat-contact-message-admin and cooking-record-dish-ingredient. Foreign-key scope and ownership are checked in every REST route. Soft delete and restore are idempotent.

Schedulers remain Vercel-compatible. The system auto-scheduler ensures future seven-day periods before evaluating the schedule, applies effective availability, never creates duplicate periods/orders under retry, and emits internal Chat notifications for relevant courier assignments. No sandbox polling, hidden background process or production database reset is introduced.

ActionLog records universal mutations with actor, command, resource, ids, old/new state, date/range, result and correlation/idempotency key. Sensitive credentials, tokens and plaintext client passwords never enter logs, JSON responses or committed files.

## 16. Verification matrix

Before completion, add or update tests for each contract below.

| Layer | Required verification |
|---|---|
| Pure domain | key state transition table; selection persistence; Trash restore; mode lock; enabled/disabled resolver; interval boundaries; route week navigation; cooking quantity scaling; AI grounding; phone normalization |
| REST/security | role and group scope; ownership; cross-scope card/contract/route rejection; System protection; disabled recipient; deleted recipient; restore; idempotent create/renew/finish |
| PostgreSQL | migrations up to date; contract renewal concurrency; purchase Finish concurrency; one ledger transaction; one inventory update; route stop uniqueness; historical immutability |
| Browser desktop | every page rail entry; exact universal command visual states; Search expansion; Calendar window; Filter window/key; selected-elements Edit; disable-courier reassignment; Finance card expansion; Calculator Save/Finish; Routes create/reorder; Cooking Plus/expand/Save; Chat lifecycle; client/courier scoped shells |
| Browser mobile | no hidden duplicate panels; hitboxes remain reachable; bottom actions do not cover content; tables and rails scroll correctly; active selection remains visible |
| Accessibility | labels, keyboard navigation, focus ring, contrast for all active/disabled states, no inaccessible icon-only commands, no serious axe violations |
| Performance | bounded list queries and calendar ranges; no repeated fetch loop; stable memoized effective resolver; no unbounded route/AI payload; no duplicate component mounts for same resource |
| Deployment | typecheck; unit; local integration; safe production build; migration status; `git diff --check`; secret scan; remote SHA; Vercel-ready deployment check |

## 17. Work order and stopping rule

Implementation proceeds in this order: reference visual/interaction audit; resource adapter and state-machine contract; unified shell visual replacement; universal command behavior; calendar/effective resolver; Chat; contracts/courier reassignment; Finance; Calculator; Routes; Cooking; AI audio/purchase; client/courier shells; localization/style cleanup; complete verification. Every slice requires a test before moving to the next.

The agent must not stop after a build, after a partial screenshot, after a cosmetic token change or after a single happy-path browser test. If a test exposes legacy/new UI duplication, the duplication is fixed rather than hidden with opacity or force-mount. If a requirement cannot be implemented because an external provider is unavailable, the UI exposes a truthful fallback and the plan records the provider seam; it is not marked complete.

Only when every matrix row passes may the final cohesive commit be created and pushed. No production reset, force push, token reuse or interim “done” message is allowed before that point.

## 18. Explicit gap register from the previous attempt

The previous attempt must be treated as incomplete in these areas and each requires a concrete closure task: universal buttons were visually left in the old AutoFood style; the reference button placement/state grammar was not copied; the resource adapter was partial; Filter/Search/Calendar were partly decorative; universal commands did not mutate every resource consistently; Chat lacked complete contact create/auto-SMS UI; contract courier reassignment and scheduler courier assignment were incomplete; Finance card editing/manual assignment was incomplete; Calculator contained duplicate immediate-buy and Finish pathways; effective availability did not propagate through every set/group/dish/order calculation; Routes was a partial page rather than a full map/reorder workflow; Cooking lacked full expandable ingredient preparation records; AI audio recording/transcription and confirmation UI were incomplete; the super-admin/governance entry and courier shell still used a different visual grammar; and English fallback labels remained.

Each gap must be closed by implementation plus a named test in the verification matrix, not by updating a status label.
