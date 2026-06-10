# PR3: Extract Dashboard Shell — Work Record

**Task ID:** 3
**Agent:** code-agent
**Date:** 2026-03-04

## Summary

Extracted the dashboard shell (header, tabs navigation, settings/chat dialogs, change password modal) from `AdminDashboardPage.tsx` into a separate component hierarchy under `src/features/admin-dashboard/shell/`.

## Files Created

1. **`src/features/admin-dashboard/shell/types.ts`** — Shared type definitions:
   - `TabsCopy` — Tab label type matching `DesktopTabsNav`/`MobileBottomTabsNav` Copy
   - `ProfileUiText` — Full localised UI text type (100+ keys)
   - `AdminTopbarProps` — Props for the topbar component
   - `AdminDashboardShellProps` — Props for the shell orchestrator

2. **`src/features/admin-dashboard/shell/AdminTopbar.tsx`** — Header bar component:
   - Theme toggle (light/dark/system) via `useAdminSettingsContext`
   - Language switcher (`<LanguageSwitcher />`)
   - Trial status badge (`<TrialStatus compact />`)
   - Database link (middle admin only)
   - Profile dropdown with messages, settings, logout actions

3. **`src/features/admin-dashboard/shell/AdminDashboardShell.tsx`** — Shell orchestrator:
   - Renders `AdminTopbar`
   - Chat dialog (`<ChatCenter />` via dynamic import)
   - Settings dialog (with `settingsDialogContent` slot)
   - Tabs navigation (`DesktopTabsNav` + `MobileBottomTabsNav`)
   - Change password modal (`<ChangePasswordModal />` via dynamic import)
   - Children slot for tab content

4. **`src/features/admin-dashboard/shell/index.ts`** — Barrel exports

## Files Modified

1. **`src/components/admin/AdminDashboardPage.tsx`** — Major refactoring:
   - Removed inline header, chat dialog, settings dialog, tabs nav, change password modal
   - Replaced with `<AdminDashboardShell>` component
   - Settings dialog body extracted as `settingsContent` variable (passed as `settingsDialogContent` prop)
   - Removed unused imports: `Link`, `useAdminSettingsContext`, `DropdownMenu*`, `Moon`, `Sun`, `Monitor`, `CircleUser`, `Settings`, `MessageSquare`, `LogOut`, `Database`, `LanguageSwitcher`, `TrialStatus`, `ChangePasswordModal`, `DesktopTabsNav`, `MobileBottomTabsNav`, `ChatCenter`
   - Added imports: `AdminDashboardShell`, `ProfileUiTextType`

## Design Decisions

- **`settingsDialogContent` as ReactNode prop**: The settings dialog body contains warehouse configuration business logic with many state variables and handlers. Rather than passing 20+ warehouse-related props through the shell, the content is passed as a ReactNode slot. This keeps business logic in `AdminDashboardPage` while the shell manages the dialog wrapper.
- **AdminTopbar uses contexts directly**: `useLanguage` and `useAdminSettingsContext` are called inside `AdminTopbar` rather than passing translations/theme state as props. This reduces prop drilling.
- **`isLowAdminView` kept as prop**: Part of the shell API contract per task requirements, even though not directly used in shell rendering. Added eslint-disable comment.

## Verification

- ✅ `next build` passes with no errors (only pre-existing warnings about bcryptjs in Edge Runtime)
- ✅ `bun run lint` shows 0 errors, no new warnings in shell files
- ✅ No behavioral changes — all existing functionality preserved through exact CSS classes and component structure
