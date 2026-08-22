# `-1` Reference Deep Audit

## Reference interaction contract

The reference app uses one persistent `Scaffold` with a static top app bar and a persistent bottom navigation surface. Top controls are square icon actions with accessible content descriptions; the bottom navigation uses matching square icon buttons without visible text labels. Search, date range, filter, create, edit, delete, scanner, and SMS actions are routed through the top action surface rather than duplicated inside each resource screen.

The reference resource screens use dense, horizontally scrollable tables with explicit column filters, optional column visibility, sortable headers, selection, and single-click detail navigation. Long-press selection is reserved for bulk edit/delete actions. Transactions are a unified ledger with search/date/filter controls, typed income/expense rows, linked resource identifiers, and contract history as a related operational record. Contract and transaction screens preserve the same table and action vocabulary.

## AutoFood mapping and remaining constraints

AutoFood keeps REST/Next.js/Prisma rather than copying the Android/Room/WorkManager stack. Its current implementation now has one top header, a universal fixed bottom resource navigator, shared resource action bars, active-only scoped resource detail aggregation, derived operational contracts, and preserved domain mutations. Prisma has no persisted Contract model, so Order, Delivery Plan, and Employment records must remain explicitly derived projections. The next implementation slices prioritize icon-only navigation fidelity, flat Finance and Warehouse resource panes, selection/filter consistency, and browser verification against real scoped fixtures.

## Primary source

The audited source is the local clone of `ozodbekasilbekov2-gif/-1`, commit `297fed5`, especially `MainActivity.kt`, `TransactionListScreen.kt`, and `ContractListScreen.kt`.

## Final validation snapshot

After the second deep interaction slice, the local-safe production build completed successfully. The complete unit suite passed 142/142 tests, the PostgreSQL integration suite passed 2/2 tests, and the desktop/mobile Playwright suite passed 168/168 tests with one worker and retries enabled. The resource-workspace disclosure test passed on both desktop and mobile, including the Finance customer-transaction drill-down.

The final UI changes remain additive: existing mutations, API URLs, Prisma schema, roles, group scoping, and Vercel deployment behavior were preserved. The only data projection addition to an existing Finance response is the non-breaking customer `id`, required to open the shared Client detail resource.
