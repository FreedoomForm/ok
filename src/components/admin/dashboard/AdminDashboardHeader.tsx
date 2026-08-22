'use client'

import Link from 'next/link'
import { Database, LogOut, MessageSquare, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { IconButton } from '@/components/ui/icon-button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { TrialStatus } from '@/components/admin/TrialStatus'

export type AdminTheme = 'light' | 'dark' | 'system'

type AdminDashboardHeaderProps = {
  title: string
  currentDate: string
  theme: AdminTheme
  themeLabel: string
  systemLabel: string
  darkLabel: string
  lightLabel: string
  databaseLabel: string
  messagesLabel: string
  settingsLabel: string
  logoutLabel: string
  isMiddleAdminView: boolean
  onThemeChange: (theme: AdminTheme) => void
  onOpenChat: () => void
  onOpenSettings: () => void
  onLogout: () => void
}

export function AdminDashboardHeader({
  title,
  currentDate,
  theme,
  themeLabel,
  systemLabel,
  darkLabel,
  lightLabel,
  databaseLabel,
  messagesLabel,
  settingsLabel,
  logoutLabel,
  isMiddleAdminView,
  onThemeChange,
  onOpenChat,
  onOpenSettings,
  onLogout,
}: AdminDashboardHeaderProps) {
  const nextTheme: AdminTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const themeName = theme === 'system' ? systemLabel : theme === 'dark' ? darkLabel : lightLabel

  return (
    <header className="relative z-10 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="hidden text-base font-semibold tracking-tight md:block">{title}</h1>
            <span className="hidden text-xs text-muted-foreground md:block" aria-hidden="true">|</span>
            <span className="hidden text-xs text-muted-foreground md:block">{currentDate || ' '}</span>
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              label={`${themeLabel}: ${themeName}`}
              type="button"
              variant="outline"
              iconSize="md"
              onClick={() => onThemeChange(nextTheme)}
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'system' ? <Monitor className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </IconButton>
            <LanguageSwitcher />
            <div className="hidden md:block">
              <TrialStatus compact />
            </div>

            {isMiddleAdminView && (
              <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label={databaseLabel} title={databaseLabel}>
                <Link href="/middle-admin/database">
                  <Database className="h-4 w-4" />
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label={settingsLabel} variant="ghost" iconSize="md" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onOpenChat} className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{messagesLabel}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenSettings} className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{settingsLabel}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void onLogout()} className="gap-2 text-rose-600 focus:text-rose-600">
                  <LogOut className="h-4 w-4" />
                  <span>{logoutLabel}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
