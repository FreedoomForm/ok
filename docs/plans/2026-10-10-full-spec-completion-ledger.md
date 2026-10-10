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
