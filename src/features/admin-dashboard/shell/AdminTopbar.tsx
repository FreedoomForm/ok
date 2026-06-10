'use client'

import Link from 'next/link'
import { useAdminSettingsContext } from '@/contexts/AdminSettingsContext'
import { IconButton } from '@/components/ui/icon-button'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Moon,
  Sun,
  Monitor,
  Database,
  CircleUser,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrialStatus } from '@/components/admin/TrialStatus'
import type { AdminTopbarProps } from './types'

/**
 * Admin dashboard top bar — title, theme toggle, language switcher,
 * trial status, profile dropdown, and logout.
 */
export function AdminTopbar({
  currentDate,
  profileUiText,
  isMiddleAdminView,
  onOpenChat,
  onOpenSettings,
  onLogout,
}: AdminTopbarProps) {
  const { t } = useLanguage()
  const { settings: adminSettings, updateSettings: updateAdminSettings, mounted: adminSettingsMounted } =
    useAdminSettingsContext()

  return (
    <header className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="page-header h-14">
          <div className="flex items-center gap-4">
            <h1 className="page-header-title text-base">{t.admin.dashboard}</h1>
            <span className="hidden md:block text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground hidden md:block">
              {currentDate || ' '}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              label={
                adminSettingsMounted
                  ? `${t.admin.theme}: ${
                      adminSettings.theme === 'system'
                        ? t.admin.system
                        : adminSettings.theme === 'dark'
                          ? t.admin.dark
                          : t.admin.light
                    }`
                  : t.admin.theme
              }
              type="button"
              variant="outline"
              iconSize="md"
              onClick={() => {
                const next =
                  adminSettings.theme === 'light' ? 'dark' : adminSettings.theme === 'dark' ? 'system' : 'light'
                updateAdminSettings({ theme: next })
              }}
            >
              {adminSettings.theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : adminSettings.theme === 'system' ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </IconButton>
            <LanguageSwitcher />
            <div className="hidden md:block">
              <TrialStatus compact />
            </div>
            {isMiddleAdminView && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                aria-label={profileUiText.database}
                title={profileUiText.database}
              >
                <Link href="/middle-admin/database">
                  <Database className="w-4 h-4" />
                </Link>
              </Button>
            )}
            {isMiddleAdminView && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex h-9 w-9"
                aria-label={profileUiText.database}
                title={profileUiText.database}
              >
                <Link href="/middle-admin/database">
                  <Database className="w-4 h-4" />
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="Profile" variant="ghost" iconSize="md" className="h-9 w-9">
                  <CircleUser className="h-4 w-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onOpenChat} className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{profileUiText.messages}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenSettings} className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{t.admin.settings}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void onLogout()} className="gap-2 text-rose-600 focus:text-rose-600">
                  <LogOut className="h-4 w-4" />
                  <span>{t.common.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
