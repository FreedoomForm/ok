

## Local runtime smoke — 2026-08-21

An isolated PostgreSQL 16 instance was installed and started on `127.0.0.1:5432` with a local `user/pass` test database named `db`; Prisma `db push` completed successfully and the CI test-admin fixture command completed without error. The Next.js development server started on `http://127.0.0.1:3000` and returned HTTP 200 for `/`.

Browser smoke confirmed the public homepage renders the AutoFood delivery operations content and links to `/login`. Browser smoke also confirmed `/login` renders the admin email/password form, password visibility control, Google continuation action, and signup link without a server error. No credentials were submitted.

The first database-backed integration run exposed and reproduced a real Prisma/PostgreSQL issue in `src/lib/orders/number.ts`: `pg_advisory_xact_lock()` returns PostgreSQL `void`, so `$queryRaw` caused Prisma deserialization failure. Replacing it with `$executeRaw` made the focused concurrency test and the full integration suite pass: 2/2 integration tests green.


The temporary public HTTPS proxy initially returned an unavailable page because Next.js was listening on localhost only. After restarting the dev server with `-H 0.0.0.0`, the same public URL became reachable and rendered the homepage successfully. Current temporary URL: https://3000-ik6qfhqlz3os90g34n0tp-29e498dd.us3.manus.computer/


A bounded API smoke pass against the local dev server returned: `/` 200, `/login` 200, unauthenticated `/api/admin/warehouse` 401 with `{"error":"Unauthorized"}`, unauthenticated `/api/admin/statistics` 403 with `{"error":"Доступ запрещен"}`, and PostgreSQL readiness accepted. The compiled-server attempt was intentionally not treated as an app defect because the previous dev run had replaced `.next` with development state; the deterministic dev smoke passed and was cleanly stopped afterward.


A fresh browser session against local staging loaded `/` successfully. The page exposed the expected AutoFood navigation and admin-login link. The browser dev overlay reported one development issue after the public smoke run; this is being investigated separately from the successful page response. The first indexed login link did not navigate through the automated click, so the next check will navigate directly to `/login` rather than submitting credentials.


Direct browser navigation to `/login` rendered the complete admin form: email and password inputs, password visibility control, recovery action, Google continuation, and signup link. Browser console contained only the standard React DevTools informational message; no runtime exception or network error was observed. The Next.js development overlay's single issue appears to be the devtools indicator itself rather than an application exception.


Authenticated browser smoke with the isolated fixture (`test@example.com` / `test-password`) reached `/middle-admin` after submit, confirming the login action and redirect executed. The rendered result was the application's multilingual offline fallback (`You are currently offline`) rather than the dashboard. This is a concrete browser finding requiring diagnosis; likely causes include PWA/service-worker offline handling, a failed dashboard data request, or an environment-level online-state assumption.


Follow-up diagnosis: the dev server had exited before the `/middle-admin` navigation. The live shell output ended at a prompt and `curl http://127.0.0.1:3000/` returned connection refused; no Next.js request for `/middle-admin` was logged. Kernel evidence did not show a relevant OOM kill. Therefore the observed offline fallback was caused by the foreground staging process being terminated when its bounded shell session timed out, not yet by a confirmed PWA or authorization defect. Future browser checks must keep staging under a detached process and verify server liveness before each flow.


The staging server was restarted as a detached process and readiness returned HTTP 200. On the second authenticated browser attempt, `/login` rendered normally and the test credentials were accepted into a loading state after submit; the next verification step is to wait for the final redirect and inspect the server log.


With the detached staging process alive, the second login attempt successfully redirected to `/super-admin` and rendered the Super Admin dashboard. The server logged `GET /api/admin/middle-admins 200` and `GET /api/admin/statistics 200`, while the UI still showed `Could not load dashboard data` and an empty admin list. Browser console showed no application exception, only React/ Fast Refresh logs. A direct console-context `fetch()` probe failed before producing a request, so endpoint response-shape verification will continue through source inspection and server-side HTTP probes.


The detached-server browser rerun completed authentication and reached `/super-admin`; the UI showed the expected role controls and a dashboard data-load toast while the server logged both dashboard API calls as HTTP 200. The live browser console had no application exception. The repository now includes a Playwright authenticated-login regression test and configures externally supplied `BASE_URL` runs to avoid competing web-server ownership; the HTML reporter is non-blocking (`open: never`). In this sandbox, headless Chromium runs repeatedly left orphaned browser processes and caused the short-lived Next.js dev process to disappear during multi-test runs. The minimal Playwright login test passed once (1/1), while the larger suite was not accepted as a product failure because the server lifecycle was lost before the later requests. Manual browser verification remains the authoritative staging smoke path for this session.


Final post-push browser smoke on the live staging session again returned the AutoFood homepage and rendered the complete `/login` form, including email/password inputs, recovery, Google continuation, and signup controls. Both route navigations completed without an application error.


## Reference-driven browser audit refresh — 2026-08-21

The live local staging server was restarted with isolated PostgreSQL/test-admin configuration. Browser navigation verified the public homepage at `/` and the admin `/login` page. The homepage rendered the AutoFood positioning, role summary, customer portal, and navigation to login. The login page rendered labeled email/password controls, password visibility/recovery controls, Google continuation, signup, privacy, and terms controls. The browser session reported no application error during these two navigations. The sandbox warned that memory usage exceeded 80%; subsequent browser and Playwright runs must be kept serial, with orphaned Chromium/report processes cleaned up between runs.


The browser accepted the isolated test-admin credentials and entered the login loading state after submit. Final redirect/dashboard rendering is being checked separately; no personal account or production data was used.


During the role audit, the authenticated browser redirect reached `/super-admin`, but the service worker displayed the offline page. Direct `curl` at the same time returned connection refused and no `next dev` process remained; server logs ended after `/login`. This reproduces the earlier diagnosis: the offline page is a fallback symptom of the foreground staging process being terminated by the shell timeout, not evidence of a dashboard authorization or route-rendering failure. The next browser run will use a detached process with explicit readiness and PID/log checks.


With the detached server confirmed ready, `/login` rendered normally again. The isolated test-admin form accepted credentials and entered `Загрузка...` after submit; the final redirect is being checked next. This separates server lifecycle from service-worker state and keeps the role audit serial under the sandbox memory limit.


For diagnosis, the browser unregistered one local service worker and deleted the `autofood-v3-*` caches. The subsequent direct `/super-admin` navigation failed with `ERR_CONNECTION_REFUSED`, confirming that the detached Next.js process had terminated before the request. The service worker is therefore masking a staging lifecycle failure; a production-quality browser harness must own server readiness/liveness explicitly rather than treating `/offline` as an application result.


The supervised server remained available through the next browser login attempt: `/login` rendered, the isolated credentials were accepted, and submit entered `Загрузка...`. The final route state is being inspected separately; supervised process ownership has removed the prior shell-timeout confounder.


After supervisord restarted the Next.js process, direct browser navigation to `/super-admin` finally returned the real Super Admin page rather than `/offline`. The visible shell, however, remained indefinitely on `Загрузка...` after an additional wait. This is the first confirmed application-level browser finding: route compilation/HTTP succeeds, but authenticated dashboard hydration does not resolve to the role-specific UI. The next slice will inspect client effects and API responses while the supervised server remains monitored.


The fresh production `next start` server rendered `/login`, but submitting the isolated test-admin form redirected the browser to `http://0.0.0.0:3000/login?error=Configuration`. This is a reproducible production-mode authentication configuration defect, distinct from the earlier dev-process/offline fallback. The next diagnosis is comparing NextAuth runtime environment requirements and callback host handling against the production staging command; no code change has been made yet.


After adding `AUTH_TRUST_HOST=true` to the production staging command, `/login` rendered normally and the isolated credentials filled successfully. The submit regression is being rerun now to verify that the previous `?error=Configuration` outcome is resolved.


Production browser verification now succeeds after `AUTH_TRUST_HOST=true`: the isolated test-admin login reached `/super-admin`, the dashboard hydrated to the real Super Admin UI with KPI cards, role tabs, admin filter, and create control, and the `Интерфейс` tab rendered settings. Switching to `Темная` visibly changed the dashboard theme. The remaining tab/settings checks continue serially.


Super Admin UI checks continued successfully in production mode: saving the dark theme produced `Настройки сохранены` feedback, and the `Chat` tab rendered its search control, `New` action, empty conversation state, and select-conversation guidance without an exception.


Super Admin governance checks continued: `Статистика` rendered delivered/failed/in-delivery/pending, payment profile, cadence, calorie mix, and basket-size cards with zero-safe values. `История` rendered user filter, refresh control, search field, empty audit table, and pagination controls with a correct `0 / 0` state. No browser exception or stuck loading state was observed in these tabs.


Authentication boundary checks passed in production mode: the visible `Выйти` action returned the browser to the public homepage, and a subsequent direct navigation to protected `/middle-admin` redirected to `/login`. The dark theme remained visible on the login screen, confirming the UI preference persisted through logout.


Customer-site browser checks passed in production mode: `/sites/example-healthy-food` rendered public branding, CTA/phone links, pricing plans, and login navigation without authentication. Switching the language selector from Uzbek to Russian updated the hero, feature labels, CTA copy, pricing headings, and login text in place. Some plan bullet strings remain Uzbek in the Russian view, which is a concrete translation-quality/UI backlog item rather than a runtime failure.


The browser-confirmed customer-site 404 was traced to the static showcase page linking into the DB-backed customer-site tree without a matching `Website` row. The isolated `ensure-test-admin` fixture now upserts `example-healthy-food` with valid theme/content and chat configuration. After applying that fixture, the real production customer login page rendered its phone field and actions, and its `Register` link opened the registration page with name/phone fields and the expected login link. This preserves real site behavior and makes the showcase/customer flow testable in CI and local browser staging.


Customer portal functional flow passed in production browser mode using isolated fake data: registration created `Browser Test Customer`, the same phone logged in and redirected to `/sites/example-healthy-food/client`, and the dashboard rendered balance, active orders, plan status, today menu, history link, and profile controls. Saving `https://maps.google.com/?q=41.311081,69.240562` succeeded, updated the visible current address, and showed `Location saved`. This exercised the SSRF-safe trusted-map URL path through the UI.


The customer `History` route rendered order summary cards, date picker, search, status filters, sort controls, and a correct empty state for the newly registered customer. `Back to client` returned to the dashboard with the saved location and menu/account data intact.


A navigation-aware headless probe reproduced a service-worker `controllerchange` reload during login form filling; the PWA registration was changed so automatic controller changes do not reload active pages, while an explicit user-selected `Reload` action still does. After rebuilding with the explicit Auth.js `trustHost` policy and using a single supervised production listener, the full Chromium smoke suite passed **8/8**: public/login render, persisted theme, admin authentication, unauthenticated dashboard redirect, customer phone login/portal hydration, and protected feature/AI API checks. The customer test was made strict-mode safe by targeting the form submit button rather than the duplicate header `Login` control.

The deterministic fixture now includes isolated `MIDDLE_ADMIN`, `LOW_ADMIN`, and `COURIER` accounts. A Chromium role-matrix run passed **3/3**: each account authenticated through `/login`, reached its expected `/middle-admin`, `/low-admin`, or `/courier` route, and rendered without an application/runtime error.

After the production build completed successfully and generated Tambo catalogs were restored, the complete Chromium smoke file passed **11/11** against the supervised `next start` listener. This final run covered public/login rendering, persisted theme, super-admin authentication, unauthenticated redirect, all three role dashboards, customer phone login and portal hydration, and protected feature/AI API boundaries.

The customer-profile hardening slice introduced a strict allowlisted mutation module with bounded name/address/preferences/calorie inputs, delivery-day validation, safe coordinate parsing, invalid-JSON handling, and a response projection that excludes password and internal ownership/deletion metadata. The rebuilt production server passed the customer UI regression for both rejected `https://example.com/not-a-map` input and accepted Google Maps coordinates with `Location saved`. The slice quality gate passed **71/71 unit tests**, **2/2 PostgreSQL integration tests**, TypeScript, Prisma validation, targeted ESLint with no errors, production build, and the full **11/11** Chromium suite.

The role authorization regression was extended so a browser-authenticated courier attempts the admin feature mutation endpoint and receives HTTP **403**. The complete Chromium suite then passed **12/12**, preserving all prior role, customer, PWA, and API checks.

The order-lifecycle hardening slice added a strict action/payload seam for courier and admin order mutations, bounded payment/coordinates, date validation, and unknown-field rejection while retaining legacy UI-compatible numeric strings and display fields. After rebuilding production staging, the browser suite passed **13/13**, including authenticated invalid lifecycle payload rejection before database lookup. The canonical `test:unit` command was updated to include both new suites and now passes **74/74**; PostgreSQL integration remains **2/2**.

Accessibility phase findings were converted into focused fixes rather than exclusions: the public example site's popular-plan badge moved from failing `bg-green-500`/white contrast to `bg-green-800`/white, login utility/separator controls now use readable foreground tokens, and the Google continuation button uses explicit light/dark contrast tokens. Axe critical/serious checks passed for both `/login` and `/sites/example-healthy-food`. The complete Chromium suite then passed **15/15**: two accessibility baselines plus the existing thirteen functional, role, customer, lifecycle, and authorization scenarios.

The browser performance baseline measured production `/login` at **55.1 ms responseStart**, **194.5 ms DOMContentLoaded**, **196.6 ms load**, and **31,023 bytes transferSize** in the supervised local production session. The automated timing regression uses generous 5 s/10 s/15 s response, DCL, and load ceilings to catch broad regressions without pretending to be a stable network lab benchmark.

A manual browser session retained the previously saved dark `adminSettings` preference; changing only the root class did not change the app's computed background because the provider reapplied the persisted setting. Persisting `theme: light` and reloading visibly restored the intended light palette. This explains the intermittent mixed-theme axe snapshots and motivates clearing the preference in the deterministic accessibility harness before each analysis. The harness now also blocks service-worker interception, clears local caches/preferences, and polls the Framer Motion AuthShell section to opacity `1` before axe; this prevents stale bundles and in-flight animation frames from producing false contrast results.

With the settled harness, both axe public-surface checks passed and the complete Chromium suite passed **16/16** in parallel: accessibility baselines, public-route navigation timing, login/theme/authentication, all operational roles, customer portal/profile location validation, order lifecycle validation, courier authorization denial, and protected API checks.

The client-directory extraction moved the large inline client table into a typed `ClientDirectoryTable` module. Its interface owns selection semantics, finance/order-count presentation, delivery-day rendering, status toggling, editing, and empty-state rendering while the parent retains data loading and mutation orchestration. After a fresh production build, the focused middle-admin Clients-tab contract passed and the complete Chromium suite passed **17/17**.

The first phase-9 quality gate exposed a test-infrastructure race rather than a production regression: the two PostgreSQL integration files ran concurrently against one database, so the scoped-order fixture’s intentionally high order number interleaved with the allocator test’s consecutive-number assertion. The canonical integration script now uses `--test-concurrency=1`; the same PostgreSQL suite passes **2/2** deterministically.

The next client-editor extraction initially exposed a Vercel/Next prerender regression because the map picker was imported directly into a server-rendered route. The dialog now preserves the existing dynamic `ssr: false` adapter for the browser-only map, after which the production build passed and the focused editor contract passed **1/1**: middle-admin opened Create Client, rendered name/map/delivery controls, and closed the dialog cleanly.

The database-row security slice added an allowlisted table/field parser, scalar-only bounded values, malformed-JSON handling, and controlled 400 responses before generic Prisma mapping. Its focused suite passed **6/6**, the fresh production build passed, and the browser contract passed **1/1** for unauthenticated denial and authenticated rejection of nested/unknown-table payloads.

The XLSX import hardening slice added a typed upload-policy module with a 5 MiB file cap, 2,000-row/100-column worksheet bounds, empty-file handling, and guarded workbook parsing. The canonical unit suite passed **83/83**, PostgreSQL integration passed **2/2**, the production build passed, and the full Chromium suite passed **20/20**, including the authenticated empty-upload rejection contract.

The admin-client create slice moved POST payload validation into the existing typed client mutation module. It now enforces required/bounded fields, normalized numeric/default values, delivery-day shape, and strict unknown-field rejection before Prisma create. Focused client mutation tests passed **9/9**, the production build passed, the focused browser contract passed **1/1**, and the complete Chromium suite passed **21/21**.

The follow-up client read-projection slice typed the GET authorization filter as Prisma `CustomerWhereInput` and removed obsolete response `any` casts while preserving pagination headers and the existing client response fields. The fresh production build passed, the focused GET contract passed **1/1**, and the complete Chromium suite passed **22/22**, including safe-field assertions.
