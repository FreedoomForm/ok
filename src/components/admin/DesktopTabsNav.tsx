'use client'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type CanonicalTabId } from '@/components/admin/dashboard/tabs'
import { DASHBOARD_TAB_META, DASHBOARD_TAB_ORDER } from '@/components/admin/dashboard/tabMeta'

/* ═════════════════════════════════════════════
   IA-first Dense UX — Desktop Tabs Navigation
   Law 28: predictability — tab = switch, not action
   Law 29: привычные паттерны — стандартный sidebar nav
   
   Width: 280px (expanded), Nav item height: 40px
   Icon: 20px, Gap icon-text: 12px
   Active: bg-primary-50, text-primary-700
   Inactive: text-muted-foreground, hover:bg-neutral-100
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
        className="flex items-center gap-3 w-full h-10 px-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 hover:bg-neutral-100 data-[state=active]:hover:bg-primary-50 justify-start"
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{copy[id]}</span>
      </TabsTrigger>
    )
  }

  return (
    <TabsList className="hidden md:flex md:flex-col gap-1 bg-transparent p-2 w-[220px] shrink-0 h-auto border-r border-border">
      {DASHBOARD_TAB_ORDER.map((tabId) => renderTab(tabId))}
    </TabsList>
  )
}
