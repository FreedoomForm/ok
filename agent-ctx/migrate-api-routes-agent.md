# Task: Migrate 2 API Routes to createApiRoute

## Summary
Migrated 2 admin API routes from the inline try/catch + auth + response pattern to use the shared `createApiRoute` wrapper. Also updated frontend consumers to match the new `{ data: ... }` response shape.

## Routes Migrated

### 1. `/api/admin/me` (GET)
- **Before**: Inline `try/catch`, manual `getAuthUser()`, `NextResponse.json()` for success/error
- **After**: `createApiRoute({ handler })` — auth, error handling, and response formatting handled by wrapper
- **Error handling**: `NotFoundError('User', user.id)` replaces `NextResponse.json({ error: 'User not found' }, { status: 404 })`
- **Response shape change**: `{ id, name, email, ... }` → `{ data: { id, name, email, ... } }`

### 2. `/api/admin/users-list` (GET)
- **Before**: Inline `try/catch`, manual `getAuthUser()`, `NextResponse.json()` for success/error
- **After**: `createApiRoute({ handler })` — auth, error handling, and response formatting handled by wrapper
- **Response shape change**: `{ users: [...] }` → `{ data: { users: [...] } }`

## Frontend Updates

### `useDashboardData.ts` (consumes `/api/admin/me`)
- Changed: `const data = await res.json().catch(() => null)` → `const json = await res.json().catch(() => null); const data = json?.data`
- Ensures `data.role` and `data.allowedTabs` still work after the response wrapper change

### `HistoryTable.tsx` (consumes `/api/admin/users-list`)
- Changed: `const data = await response.json(); setUsers(data.users || [])` → `const json = await response.json(); setUsers(json?.data?.users || [])`

## Files Modified
1. `/src/app/api/admin/me/route.ts` — Migrated to createApiRoute
2. `/src/app/api/admin/users-list/route.ts` — Migrated to createApiRoute
3. `/src/components/admin/dashboard/useDashboardData.ts` — Updated loadMe to unwrap `{ data }` response
4. `/src/components/admin/HistoryTable.tsx` — Updated fetchUsers to unwrap `{ data }` response

## Lint Result
- No new errors or warnings introduced
- Pre-existing `@typescript-eslint/no-explicit-any` warning on `let where: any = {}` in users-list (carried over from original)

## Key Design Decisions
- **No `requireAuth` config**: Both routes accept any authenticated admin (no role restriction), so `requireAuth` is omitted (defaults to "any authenticated user")
- **NotFoundError**: Used for the admin-not-found case in `/api/admin/me` instead of generic 404, matching the shared error pattern
- **Frontend co-migration**: Updated frontend consumers in the same change to avoid breaking the API contract
