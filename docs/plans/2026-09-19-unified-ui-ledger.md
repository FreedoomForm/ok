# Unified UI Ledger — журнал циклов плана 2026-09-19-unified-ui-plan

Статус: ACTIVE · Источник истины по требованиям: `2026-09-19-unified-ui-plan.md` + `docs/plans/pasted_content_3/4/5.txt`

Формат: каждый цикл = один commit+push в `main`. Между циклами не останавливаемся.

---

## Cycle 1 — right rail + language cycle (commit c9bedbe)
- Страницные кнопки перенесены с нижней навигации приложения на правый край сайта (план §1): rail справа, сохраняя компактность приложения и удобство большого экрана.
- Одна кнопка-цикл языка: RU→UZ→RU, английский полностью удалён (план §2).
- Rail получил border-l, Playwright webServer переведён на npm run dev/start для воспроизводимых гейтов.

## Cycle 2 — admin resource rail right edge (commit d525d5d)
- AdminDashboardPage: ресурсный rail тоже на правом краю (план §1: «кнопки страниц справа на каждой админ-поверхности»), как в RoleWorkspaceShell.

## Cycle 2b — rail nesting fix (commit 39a92b3)
- ResourcePageRail принадлежит flex-row контейнеру (правый край), а не колонке контента.

## Cycle 3 — database as a right-rail page (план §3)
- §3: «Chat, Settings, Database — отдельные страницы правой боковой панели». Chat и Settings уже были страницами rail; База данных оставалась модальной поверхностью (`?database=1`, кнопка профиля). Теперь `database` — полноценная страница воркспейса:
  - `WORKSPACE_RESOURCE_PAGES` + `RESOURCE_PAGE_REGISTRY` + `RESOURCE_PAGE_ORDER` + иконка Database в rail; порядок: chat → settings → database (панельные страницы, как в §3).
  - RESOURCE_ADAPTERS получил database-адаптер (first-class branch, без legacy-таба и calendarKind); `deriveCurrentResourcePage('database', …) → 'database'`.
  - Контент-ветка `workspaceState.page === 'database'` рендерит встроенный DatabaseWorkspace с `data-reference-database-surface`; кнопка закрытия возвращает на последнюю недатабазную страницу (ref), deep-link `?database=1` открывает страницу через `handleResourcePageSelect('database')` вместо модального состояния; `isDatabaseOpen`-стейт удалён.
  - Подписи rail: RU «База данных» / UZ «Maʼlumotlar bazasi»; порталы (courier/client/super-admin) получили пустую подпись database, их rail-списки не менялись.
- Тесты: реестр-тест обновлён на 17 страниц (порядок зафиксирован), mount-derive пинит database как first-class ветку; гейты: 359 unit + 11/11 integration + tsc 0 + lint 0 errors + build + Playwright (Chromium + Mobile Chrome, workers=2).

---

## Cycle 4 — client window loses the legacy courier select (план §5, pasted_content_3: «убери его из окна создания и изменения клиента»)
- ClientEditorDialog: селектор «Default courier» удалён из окна создания/изменения клиента — курьер теперь выбирается только на периоде контракта (ContractsTab: периоды с courierId, paid, цветом, автопродлением), как требует §5.
- Заодно закрыт англоязычный остаток «Default courier:»/«None» в этом окне (правило RU/UZ-only, §2/§12).
- Сверено с §5 по существующей доказательной базе: календарь контрактов с включёнными/выключенными днями (ResourceCalendarPanel + override-цепочка cycle-158/161/166), жёлтая подсветка активных дней, автопродление контракта на 7 дней (contract-renewal-audit), уведомления курьеру в чат через контрактные периоды (cycle-147/148).
- §10 зафиксирован как выполненный: OrderModal не содержит ввода времени при создании заказа (deliveryTime только наследуется/отображается в таблице), окно удаления времени не запрашивает.
- Гейты: 359 unit + 11/11 integration + tsc 0 + lint 0 errors + build + Playwright 404/404 (6 шардов, Chromium + Mobile Chrome, production server).

---

## Оставшиеся пункты плана (по §)
- §4 key/trash/enable/disable/sms — машина режимов реализована (workspace-state); требуется сверка деталей с §4 (переходы ключа, несброс выбора) и пиннинг регрессиями, если их ещё нет.
- §5 календарь/контракты: убрать «Default courier» из окна создания/изменения клиента (курьер живёт на периоде контракта — ContractsTab уже так); сверить жёлтую подсветку включённых дней периода и уведомления курьеру в чат.
- §6 чат-контакты: сверить с §6 (контакт «Система» по умолчанию, цвета/иконки, три режима, приветствие после создания аккаунта, авто-отправка через внутренний мессенджер).
- §7 вход клиента: login=телефон, пароль по умолчанию=телефон — проверено (customer auth + подсказка в кабинете); зафиксировать в реестре плана.
- §8 унификация курьерского/клиентского сайтов: RoleWorkspaceShell уже в трёх порталах; сверить наборы universal-кнопок и страниц.
- §9 маршруты: страница, карта, границы, еженедельные маршруты — реализовано в прежних циклах; сверить «Продолжить/Предыдущий» в шапке и дефолтный период «с сегодня до следующего понедельника».
- §10 убрать ввод времени при создании/удалении заказа — сверить OrderModal.
- §11 готовка: сверить линию цветных квадратов над Сохранить/Назад и количество ингредиентов (±).
- §12 приёмка: единая шапка universal buttons на каждой странице, RU/UZ покрытие, Сохранить справа-снизу / Назад слева-снизу во всех окнах.
