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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] pt-1.5 md:hidden">
      <TabsList className="pointer-events-auto flex h-auto w-full flex-nowrap justify-around gap-1 overflow-x-auto bg-gourmet-green/90 dark:bg-dark-green/90 p-2 rounded-t-[25px] shadow-2xl transition-colors duration-300">
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
              className="group relative flex flex-col items-center gap-0.5 py-1 bg-transparent border-0 shadow-none transition-all duration-300 data-[state=active]:scale-105"
            >
              {/* Active pill background */}
              <div className="absolute inset-y-0 w-14 left-1/2 -translate-x-1/2 rounded-[18px] transition-all duration-300 group-data-[state=active]:bg-gourmet-cream group-data-[state=active]:dark:bg-dark-surface group-data-[state=inactive]:bg-transparent" />

              {/* Circular icon */}
              <div className={`
                relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                group-data-[state=active]:bg-gourmet-green group-data-[state=active]:dark:bg-dark-green group-data-[state=active]:shadow-xl group-data-[state=active]:border-b-[3px] group-data-[state=active]:border-black/20
                group-data-[state=inactive]:bg-white group-data-[state=inactive]:dark:bg-dark-surface group-data-[state=inactive]:shadow-md group-data-[state=inactive]:border-b-[3px] group-data-[state=inactive]:border-black/10 group-data-[state=inactive]:dark:border-white/10
                active:scale-90
              `}>
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border border-dashed
                  group-data-[state=active]:border-white/30
                  group-data-[state=inactive]:border-black/10 group-data-[state=inactive]:dark:border-white/10
                `}>
                  <Icon className="h-4 w-4 text-gourmet-ink dark:text-dark-text transition-colors duration-300" />
                </div>
              </div>

              {/* Label */}
              <span className="relative z-10 text-[8px] font-bold text-gourmet-ink dark:text-dark-text transition-colors duration-300 truncate max-w-[48px]">
                {copy[tabId]}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </div>
  )
}
