/**
 * Admin dashboard shell — shared types.
 *
 * These types define the contract between the shell (layout) and the
 * page component that provides business logic & data.
 */

import type { AdminDashboardMode } from '@/features/admin-dashboard/model'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Tabs copy — mirrors DesktopTabsNav / MobileBottomTabsNav Copy type
// ---------------------------------------------------------------------------

export type TabsCopy = {
  orders: string
  clients: string
  admins: string
  bin: string
  statistics: string
  history: string
  warehouse: string
  finance: string
  interface: string
}

// ---------------------------------------------------------------------------
// Profile UI text — localised labels used across the shell
// ---------------------------------------------------------------------------

export type ProfileUiText = {
  database: string
  noDateSelected: string
  allOrders: string
  profileCenter: string
  profileCenterDescription: string
  role: string
  visibleTabs: string
  dispatchDate: string
  dispatchChooseDate: string
  dispatchSave: string
  dispatchStart: string
  security: string
  securityDescription: string
  changePassword: string
  quickNavigation: string
  warehouseStartPoint: string
  warehouseStartPointDescription: string
  warehouseInputLabel: string
  readOnly: string
  warehousePlaceholder: string
  current: string
  notConfigured: string
  preview: string
  refresh: string
  saving: string
  saveLocation: string
  useMyLocation: string
  geolocationUnsupported: string
  geolocationDenied: string
  geolocationFailed: string
  geolocationSet: string
  messages: string
  messagesDescription: string
  ordersBin: string
  clientsBin: string
  autoSet: string
  active: string
  enableAutoOrderCreation: string
  searchClientPlaceholder: string
  searchClientsAria: string
  clear: string
  calendar: string
  today: string
  clearDate: string
  allTime: string
  thisWeek: string
  thisMonth: string
  next: string
  yesterday: string
  tomorrow: string
  searchOrdersPlaceholder: string
  searchOrdersAria: string
  rows: string
  filters: string
  resetFilters: string
  noOrdersFound: string
  noOrdersFoundDescription: string
  showing: string
  of: string
  statusFilter: string
  allClients: string
  activeOnly: string
  pausedOnly: string
  bin: string
  createClient: string
  editClient: string
  updateClientDetails: string
  createClientDescription: string
  nickname: string
  nicknamePlaceholder: string
  mapLink: string
  map: string
  mapHint: string
  phoneFormat: string
  balance: string
  days: string
  daysShort: string
}

// ---------------------------------------------------------------------------
// AdminTopbar props
// ---------------------------------------------------------------------------

export type AdminTopbarProps = {
  /** Localised date string shown next to the dashboard title */
  currentDate: string
  /** Localised UI labels */
  profileUiText: Pick<ProfileUiText, 'database' | 'messages'>
  /** Whether the current user is a middle admin (shows database link) */
  isMiddleAdminView: boolean
  /** Callback to open the chat dialog */
  onOpenChat: () => void
  /** Callback to open the settings dialog */
  onOpenSettings: () => void
  /** Callback to log out */
  onLogout: () => void
}

// ---------------------------------------------------------------------------
// AdminDashboardShell props
// ---------------------------------------------------------------------------

export type AdminDashboardShellProps = {
  /** Currently active tab id */
  activeTab: string
  /** Tab change handler */
  onTabChange: (tab: string) => void
  /** Which tabs are visible */
  visibleTabs: string[]
  /** Localised tab labels */
  tabsCopy: TabsCopy
  /** Localised UI labels */
  profileUiText: ProfileUiText
  /** Whether the current user is a middle admin */
  isMiddleAdminView: boolean
  /** Whether the current user is a low admin */
  isLowAdminView: boolean
  /** Localised date string for the header */
  currentDate: string

  /** Chat dialog open state */
  isChatOpen: boolean
  setIsChatOpen: (open: boolean) => void

  /** Settings dialog open state */
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void

  /** Change-password modal open state */
  isChangePasswordOpen: boolean
  setIsChangePasswordOpen: (open: boolean) => void

  /** Log out handler */
  handleLogout: () => void

  /** Dashboard mode discriminator */
  mode: AdminDashboardMode

  /** Content rendered inside the settings dialog body */
  settingsDialogContent: ReactNode

  /** Tab content area (the main body of the dashboard) */
  children: ReactNode
}
