'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  ChefHat,
  DollarSign,
  History,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ className, activeTab, onTabChange, isOpen, onClose, onLogout }: SidebarProps) {
  const { t, language } = useLanguage();

  const menuItems = [
    { id: 'statistics', label: t.admin.statistics, icon: BarChart3, badge: null },
    { id: 'orders', label: t.admin.orders, icon: ShoppingCart, badge: 0 },
    { id: 'clients', label: t.admin.clients, icon: Users, badge: null },
    { id: 'admins', label: t.admin.admins, icon: Users, badge: null },
    { id: 'couriers', label: t.admin.couriers, icon: Truck, badge: null },
    { id: 'divider-1', type: 'divider' as const },
    { id: 'warehouse', label: t.warehouse.title, icon: Package, badge: null },
    { id: 'cooking', label: t.warehouse.cooking, icon: ChefHat, badge: null },
    { id: 'divider-2', type: 'divider' as const },
    { id: 'finance', label: t.finance.title, icon: DollarSign, badge: null },
    { id: 'history', label: t.admin.history, icon: History, badge: null },
    { id: 'divider-3', type: 'divider' as const },
    { id: 'chat', label: t.courier.chat, icon: MessageSquare, badge: null },
    { id: 'bin', label: t.admin.bin, icon: Trash2, badge: null },
    { id: 'divider-4', type: 'divider' as const },
    { id: 'profile', label: t.common.profile, icon: User, badge: null },
    { id: 'settings', label: t.admin.settings, icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Mobile overlay — simple semi-transparent, no backdrop-blur */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] -translate-x-full transition-transform duration-200 ease-out',
 '  bg-white dark:bg-[#141416]',
          'lg:static lg:translate-x-0',
          isOpen && 'translate-x-0',
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">AutoFood</p>
                <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-wide uppercase">
                  {language === 'ru' ? 'Панель' : language === 'uz' ? 'Panel' : 'Dashboard'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Simple divider */}
 <div className="mx-5" />

          {/* Navigation */}
          <ScrollArea className="flex-1 py-3">
            <nav className="space-y-0.5 px-3">
              {menuItems.map((item) => {
                if ('type' in item && item.type === 'divider') {
                  return (
                    <div
                      key={item.id}
 className="my-2"
                    />
                  );
                }

                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <Button
                    type="button"
                    variant="ghost"
                    key={item.id}
                    className={cn(
                      'relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary/10 text-primary-700 dark:text-primary-400'
                        : 'text-[var(--text-secondary)] hover:bg-zinc-50 dark:hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
                    )}
                    onClick={() => {
                      onTabChange(item.id);
                      onClose();
                    }}
                  >
 {/* Simple left indicator — 2px solid primary-600, no glow */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-sm bg-primary-600 dark:bg-primary-500" />
                    )}
                    <Icon className={cn(
                      'h-5 w-5 shrink-0',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-[var(--text-muted)]'
                    )} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
 <Badge className="h-5 min-w-5 bg-primary-50 dark:bg-primary/15 text-primary-700 dark:text-primary-400 px-1.5 text-[10px] shadow-none font-semibold">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer - Logout */}
 <div className="mx-5" />
          <div className="p-3">
            <Button
              type="button"
              variant="ghost"
              className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--danger)] hover:bg-neutral-50 dark:hover:bg-neutral-500/[0.08] hover:text-[var(--danger)] transition-colors duration-150"
              onClick={onLogout}
            >
              <LogOut className="h-5 w-5" />
              {t.common.logout}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
