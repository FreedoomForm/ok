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
    <div className="md:hidden">
      <TabsList className="fixed bottom-0 left-0 right-0 flex h-auto w-full flex-row flex-nowrap justify-around gap-1 overflow-x-auto bg-gourmet-green/90 dark:bg-dark-green/90 p-2 rounded-t-[30px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] z-40 transition-colors duration-300 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
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
              className="flex flex-col items-center gap-1 group relative py-2 bg-transparent border-0 shadow-none transition-all duration-300 data-[state=active]:scale-105"
            >
              {/* Active pill background */}
              <div className="absolute inset-y-0 w-16 left-1/2 -translate-x-1/2 rounded-[20px] shadow-[-10px_0_15px_rgba(0,0,0,0.05)] transition-all duration-300 group-data-[state=active]:bg-gourmet-cream group-data-[state=active]:dark:bg-dark-surface group-data-[state=inactive]:bg-transparent group-data-[state=inactive]:opacity-0" />

              {/* Circular icon */}
              <div className={`
                relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden
                group-data-[state=active]:bg-gourmet-green group-data-[state=active]:dark:bg-dark-green group-data-[state=active]:shadow-2xl group-data-[state=active]:border-b-4 group-data-[state=active]:border-black/20
                group-data-[state=inactive]:bg-white group-data-[state=inactive]:dark:bg-dark-surface group-data-[state=inactive]:shadow-lg group-data-[state=inactive]:border-b-4 group-data-[state=inactive]:border-black/10 group-data-[state=inactive]:dark:border-white/10
                active:scale-95
              `}>
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 border-dashed
                  group-data-[state=active]:border-white/30
                  group-data-[state=inactive]:border-black/10 group-data-[state=inactive]:dark:border-white/10
                `}>
                  <Icon className="h-5 w-5 text-gourmet-ink dark:text-dark-text transition-colors duration-300 group-data-[state=active]:animate-bounce" />
                </div>
              </div>

              {/* Label */}
              <span className="relative z-10 text-[9px] font-bold text-gourmet-ink dark:text-dark-text transition-colors duration-300 truncate max-w-[50px]">
                {copy[tabId]}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </div>
  )
}
