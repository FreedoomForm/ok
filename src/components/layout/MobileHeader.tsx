'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, Menu, Settings, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BasicDropdown, type DropdownItem } from '@/components/smoothui';

interface MobileHeaderProps {
  onMenuClick: () => void;
  currentTab: string;
  tabLabels: Record<string, string>;
  userName?: string;
  onLogout: () => void;
}

export function MobileHeader({
  onMenuClick,
  currentTab,
  tabLabels,
  userName,
  onLogout,
}: MobileHeaderProps) {
  const { t } = useLanguage();
  const resolvedUserName = userName ?? 'User';

  const actionItems: DropdownItem[] = [
    { id: 'profile', label: t.common.profile, icon: <User className="h-4 w-4" /> },
    { id: 'settings', label: t.admin.settings, icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: t.common.logout, icon: <LogOut className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Меню"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold tracking-tight text-foreground">
            {tabLabels[currentTab] || currentTab}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Уведомления"
            className="relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              3
            </span>
          </Button>

          <div className="relative h-9 w-9">
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl">
              <Avatar className="h-7 w-7 border border-border shadow-sm">
                <AvatarFallback className="bg-muted text-[11px] font-bold text-foreground">
                  {resolvedUserName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <BasicDropdown
              className="h-9 w-9 opacity-0"
              label={t.common.profile}
              items={actionItems}
              onChange={(item) => {
                if (item.id === 'logout') onLogout();
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
