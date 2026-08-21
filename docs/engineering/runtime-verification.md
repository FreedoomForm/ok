

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
