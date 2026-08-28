'use client'

import { useEffect, useState } from 'react'
import {
  Menu,
  Package,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { DASHBOARD_TAB_META, DASHBOARD_TAB_ORDER, getDashboardTabLabels } from '@/components/admin/dashboard/tabMeta'
import type { CanonicalTabId } from '@/components/admin/dashboard/tabs'

interface MobileSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  visibleTabs?: string[]
}

export function MobileSidebar({ activeTab, onTabChange, visibleTabs }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t, language } = useLanguage()
  const labels = getDashboardTabLabels(t)
  const openLabel = language === 'uz' ? 'Menyuni ochish' : 'Открыть меню'
  const closeLabel = language === 'uz' ? 'Menyuni yopish' : 'Закрыть меню'
  const openedState = language === 'uz' ? 'Ochildi' : 'Открыто'

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('keydown', onEsc)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const allTabs = DASHBOARD_TAB_ORDER.map((id) => ({
    id,
    label: labels[id],
  }))

  const effectiveTabs = visibleTabs?.length
    ? allTabs.filter((tab) => visibleTabs.includes(tab.id))
    : allTabs

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 h-11 w-11 rounded-xl border-border bg-card shadow-sm md:hidden"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? closeLabel : openLabel}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <aside className="fixed left-0 top-0 bottom-0 z-50 w-[300px] overflow-y-auto border-r border-border bg-card md:hidden">
            <div className="sticky top-0 border-b border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">AutoFood</h2>
                    <p className="text-[10px] tracking-[0.08em] text-muted-foreground">
                      {t.admin.dashboard}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <nav className="p-3 space-y-1">
              {effectiveTabs.map((tab) => {
                const config = DASHBOARD_TAB_META[tab.id as CanonicalTabId] || {
                  icon: Package,
                  mobileAccent: 'bg-foreground',
                  desktopAccent: '',
                }
                const Icon = config.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors duration-150',
                      isActive
                        ? 'border-border bg-muted text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
                        isActive ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm">{tab.label}</span>
                    {isActive ? <span className="ml-auto text-[11px] font-medium text-foreground">{openedState}</span> : null}
                  </button>
                )
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card p-4">
              <p className="text-center text-[10px] text-muted-foreground">
                (c) {new Date().getFullYear()} AutoFood
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
