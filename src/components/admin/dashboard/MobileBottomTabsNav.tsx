'use client'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type CanonicalTabId } from '@/components/admin/dashboard/tabs'
import { DASHBOARD_TAB_META, DASHBOARD_TAB_ORDER } from '@/components/admin/dashboard/tabMeta'

/* ═════════════════════════════════════════════
   IA-first Dense UX — Mobile Bottom Tabs Navigation
   Law 15: mobile controls 44-48px
   Law 16: important actions closer to bottom
   Law 29: привычные паттерны — стандартный bottom nav
   
   Height: 56px + safe-area, Item: icon 20px + label 12px
   Active: text-primary, Inactive: text-muted-foreground
   Background: white with border-top
   ═════════════════════════════════════════════ */

type Copy = {
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

export function MobileBottomTabsNav({ visibleTabs, copy }: { visibleTabs: string[]; copy: Copy }) {
  const has = (tab: CanonicalTabId) => visibleTabs.includes(tab)

  return (
    <div className="md:hidden">
      <TabsList className="fixed bottom-0 left-0 right-0 flex h-auto w-full flex-row flex-nowrap justify-around gap-0 overflow-x-auto bg-background border-t border-border p-1 z-40 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
        {DASHBOARD_TAB_ORDER.map((tabId) => {
          if (!has(tabId)) return null
          const meta = DASHBOARD_TAB_META[tabId]
          if (!meta) return null
          const Icon = meta.icon

          return (
            <TabsTrigger
              key={tabId}
              value={tabId}
              title={copy[tabId]}
              aria-label={copy[tabId]}
              className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg bg-transparent transition-colors data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground min-w-[56px]"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium truncate max-w-[56px] leading-tight">
                {copy[tabId]}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </div>
  )
}
