# Task 4: Extract tab content from AdminDashboardPage.tsx

## Summary

Extracted inline tab content from `AdminDashboardPage.tsx` into separate tab components under `src/features/admin-dashboard/tabs/`.

## Files Created

- `src/features/admin-dashboard/tabs/StatisticsTab.tsx` (154 lines) - Statistics overview cards
- `src/features/admin-dashboard/tabs/OrdersTab.tsx` (359 lines) - Order management tab with filters and table
- `src/features/admin-dashboard/tabs/ClientsTab.tsx` (877 lines) - Client CRUD tab with form dialog and alert dialogs
- `src/features/admin-dashboard/tabs/BinTab.tsx` (284 lines) - Bin/recycle bin tab for deleted orders and clients
- `src/features/admin-dashboard/tabs/index.ts` (10 lines) - Barrel exports

## Files Modified

- `src/components/admin/AdminDashboardPage.tsx` - Reduced from ~3950 to 2846 lines
  - Replaced inline statistics tab with `<StatisticsTab>` component
  - Replaced inline orders tab with `<OrdersTab>` component
  - Replaced inline clients tab with `<ClientsTab>` component
  - Replaced inline bin tab with `<BinTab>` component
  - Removed client AlertDialogs (moved into ClientsTab)
  - Removed `DispatchActionIcon`/`dispatchActionLabel` (moved into OrdersTab)
  - Cleaned up unused imports

## Design Decisions

- Tab components receive data and callbacks as props (no direct state management)
- All tab components use dynamic imports for code splitting
- ClientsTab includes its own AlertDialogs for pause/resume/delete actions
- OrdersTab computes its own `DispatchActionIcon`/`dispatchActionLabel`
- TypeScript interfaces defined for all props
- Same visual appearance maintained

## Build Verification

- `bun run lint` passes with 0 errors
- `./node_modules/.bin/next build` completes successfully
