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
        className="group flex w-full flex-col items-center gap-1 rounded-base border-0 bg-transparent py-2 text-muted-foreground shadow-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-base border border-border bg-background group-data-[state=active]:border-primary group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground xl:h-16 xl:w-16">
          <Icon className="h-6 w-6 xl:h-7 xl:w-7" aria-hidden="true" />
        </span>
        <span className="truncate text-[10px] font-semibold xl:text-xs">{copy[id]}</span>
      </TabsTrigger>
    )
  }

  return (
    <TabsList className="hidden h-auto w-[110px] shrink-0 flex-col items-center gap-2 border-r border-border bg-background p-2 xl:w-[120px] xl:p-3 md:flex">
      {DASHBOARD_TAB_ORDER.map(renderTab)}
    </TabsList>
  )
}
