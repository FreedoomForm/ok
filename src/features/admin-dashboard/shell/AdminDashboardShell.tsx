'use client'

import dynamic from 'next/dynamic'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs } from '@/components/ui/tabs'
import { DesktopTabsNav } from '@/components/admin/dashboard/DesktopTabsNav'
import { MobileBottomTabsNav } from '@/components/admin/dashboard/MobileBottomTabsNav'
import { useLanguage } from '@/contexts/LanguageContext'

// ChangePasswordModal — dynamic for code splitting (heavy modal with own dependency chain)
const ChangePasswordModal = dynamic(
  () => import('@/components/admin/ChangePasswordModal').then(m => ({ default: m.ChangePasswordModal })),
  { ssr: false }
)

// ChatCenter is only rendered when isChatOpen is true — lazy-load it to avoid pulling
// @tambo-ai/react and its heavy dependency chain into the initial admin chunk.
const ChatCenter = dynamic(
  () => import('@/components/chat/ChatCenter').then((mod) => mod.ChatCenter),
  { ssr: false }
)

import { AdminTopbar } from './AdminTopbar'
import type { AdminDashboardShellProps } from './types'

/**
 * Admin dashboard shell — the outer layout that wraps all dashboard views.
 *
 * Contains:
 * 1. Header bar (theme toggle, language switcher, trial status, profile dropdown, logout)
 * 2. Chat dialog
 * 3. Settings dialog
 * 4. Tabs navigation (desktop sidebar + mobile bottom nav)
 * 5. Change-password modal
 * 6. Children slot for tab content
 */
export function AdminDashboardShell({
  activeTab,
  onTabChange,
  visibleTabs,
  tabsCopy,
  profileUiText,
  isMiddleAdminView,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of shell API contract; used by settingsDialogContent and future PRs
  isLowAdminView,
  currentDate,
  isChatOpen,
  setIsChatOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  isChangePasswordOpen,
  setIsChangePasswordOpen,
  handleLogout,
  settingsDialogContent,
  children,
}: AdminDashboardShellProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AdminTopbar
        currentDate={currentDate}
        profileUiText={profileUiText}
        isMiddleAdminView={isMiddleAdminView}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        {/* Mobile PWA: full-screen dialog (like dispatch panel). Desktop: centered large modal. */}
        <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none h-[100svh] !rounded-none gap-0 !p-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-[min(98dvh,1560px)] sm:max-w-[min(96vw,1600px)] md:h-[min(98dvh,1800px)] md:max-w-[min(98vw,1800px)] sm:!rounded-3xl">
          <div className="flex h-full min-h-0 flex-col">
            <div className="bg-background/80 px-4 py-3 backdrop-blur">
              <DialogTitle>{profileUiText.messages}</DialogTitle>
              <DialogDescription>{profileUiText.messagesDescription}</DialogDescription>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatCenter />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        {/* Mobile PWA: full-screen dialog. Desktop: centered large modal. */}
        <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none h-[100svh] !rounded-none gap-0 !p-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-[min(98dvh,1560px)] sm:max-w-[min(96vw,1600px)] md:h-[min(98dvh,1800px)] md:max-w-[min(98vw,1800px)] sm:!rounded-3xl">
          <div className="flex h-full min-h-0 flex-col">
            <div className="bg-background/80 px-4 py-3 backdrop-blur">
              <DialogTitle>{t.admin.settings}</DialogTitle>
              <DialogDescription>
                {profileUiText.warehouseStartPoint} / {profileUiText.database}
              </DialogDescription>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-6">
              {settingsDialogContent}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row flex-1 py-4 md:py-6 px-2 md:px-4 gap-4 md:gap-6 pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col md:flex-row flex-1 w-full gap-4 md:gap-6">
          <DesktopTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />
          <MobileBottomTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />

          <main className="flex-1 min-w-0">
            <div className="h-full flex flex-col gap-4 md:gap-6 relative overflow-hidden px-4 md:px-6 py-4 md:py-6 bg-surface rounded-xl">
              {children}
            </div>
          </main>
        </Tabs>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  )
}
