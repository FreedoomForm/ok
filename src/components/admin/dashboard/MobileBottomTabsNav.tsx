'use client'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type CanonicalTabId } from '@/components/admin/dashboard/tabs'
import { DASHBOARD_TAB_META, DASHBOARD_TAB_ORDER } from '@/components/admin/dashboard/tabMeta'

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
    <div className="w-full">
      <TabsList className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-40 flex h-auto w-full flex-row flex-nowrap justify-around gap-1 overflow-x-auto border-x-0 border-b-0 border-t border-border bg-background p-2 shadow-none md:gap-2 md:p-2">
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
              className="group flex size-14 min-w-14 items-center justify-center rounded-base border-0 bg-transparent p-0 text-muted-foreground shadow-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <span className="flex size-12 items-center justify-center rounded-base border border-border bg-background group-data-[state=active]:border-primary group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground">
                <Icon className="size-6" aria-hidden="true" />
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </div>
  )
}
