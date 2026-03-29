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

export function DesktopTabsNav({ visibleTabs, copy }: { visibleTabs: string[]; copy: Copy }) {
  const has = (tab: CanonicalTabId) => visibleTabs.includes(tab)

  const renderTab = (id: CanonicalTabId) => {
    if (!has(id)) return null
    const meta = DASHBOARD_TAB_META[id]
    if (!meta) return null
    const Icon = meta.icon
    return (
      <TabsTrigger
        key={id}
        value={id}
        className="group relative flex flex-col items-center gap-1 py-3 transition-all duration-300 data-[state=active]:scale-105 bg-transparent border-0 shadow-none"
      >
        {/* Active background pill */}
        <div className="absolute inset-y-0 w-[100px] left-1/2 -translate-x-1/2 rounded-[25px] transition-all duration-300 group-data-[state=active]:bg-gourmet-cream group-data-[state=active]:dark:bg-dark-surface group-data-[state=active]:shadow-[-8px_0_12px_rgba(0,0,0,0.05)] group-data-[state=inactive]:bg-transparent" />

        {/* Circular icon button */}
        <div className={`
          relative z-10 w-16 h-16 xl:w-20 xl:h-20 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden
          group-data-[state=active]:bg-gourmet-green group-data-[state=active]:dark:bg-dark-green group-data-[state=active]:shadow-2xl group-data-[state=active]:border-b-4 group-data-[state=active]:border-black/20
          group-data-[state=inactive]:bg-white group-data-[state=inactive]:dark:bg-dark-surface group-data-[state=inactive]:shadow-lg group-data-[state=inactive]:border-b-4 group-data-[state=inactive]:border-black/10 group-data-[state=inactive]:dark:border-white/10
          hover:scale-110 hover:-translate-y-1 active:scale-95
        `}>
          {/* Inner dashed border circle */}
          <div className={`
            w-14 h-14 xl:w-18 xl:h-18 rounded-full flex items-center justify-center border-2 border-dashed
            group-data-[state=active]:border-white/30
            group-data-[state=inactive]:border-black/10 group-data-[state=inactive]:dark:border-white/10
          `}>
            <Icon className="h-6 w-6 xl:h-8 xl:w-8 text-gourmet-ink dark:text-dark-text transition-colors duration-300" />
          </div>
        </div>

        {/* Label */}
        <span className="relative z-10 text-[10px] xl:text-xs font-bold text-gourmet-ink dark:text-dark-text transition-colors duration-300 truncate max-w-[90px]">
          {copy[id]}
        </span>
      </TabsTrigger>
    )
  }

  return (
    <TabsList className="hidden md:flex md:flex-col gap-4 bg-gourmet-green/40 dark:bg-dark-green/40 p-3 xl:p-4 rounded-[35px] xl:rounded-[40px] shadow-inner w-[110px] xl:w-[120px] shrink-0 h-auto items-center transition-colors duration-300">
      {DASHBOARD_TAB_ORDER.map((tabId) => renderTab(tabId))}
    </TabsList>
  )
}
