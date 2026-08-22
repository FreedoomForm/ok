# Resource workspace browser findings

Local production build (`next build` plus `next start`) served successfully on port 3000 and `/api/health/ready` returned database status `ok`.

Authenticated `/middle-admin` browser smoke showed the updated shell: a compact top header with theme/language/database/settings controls, a large flat workspace, and a fixed universal bottom panel containing Orders, Clients, Admins, Warehouse, Finance, History, and Bin. The panel remained visible on desktop while content changed between tabs.

Warehouse rendered the four resource panes Cooking, Sets, Inventory, and Calculator. Cooking preserved the date/menu selector, active-plan filter, refresh action, quantity matrix, and cooking totals. The grid was corrected to four equal sub-tabs.

Finance rendered company balance, debt/prepayment summaries, transaction history, client resource index, and the new salary/admin resource index. In the local staging dataset, client/admin lists were empty, so row-level disclosure clicks could not be exercised from the browser; the route and pure projection tests cover the shared data contract.

Clients and Admins rendered the resource tables and fixed bottom navigation. The local staging dataset had no visible rows in those scoped middle-admin tables, so row disclosure was not clickable in this smoke run.

The `/super-admin` route intentionally retains its separate governance tab layout; the universal resource workspace requirement applies to the main operational admin shell at `/middle-admin` and `/low-admin`.

## Quality gates

The pure resource-details suite passed with 5 tests. The full unit suite passed with 142 tests. PostgreSQL integration tests passed with 2 tests. The complete Playwright suite passed with 168 tests across desktop and mobile projects, including the new three-entity disclosure flow. The local-safe production build passed after the final active-resource hardening. ESLint completed with no errors; the repository retains pre-existing `no-console` warnings in operational code, while the changed files have no unused-import errors.
