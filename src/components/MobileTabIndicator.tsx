'use client'

import { Package } from 'lucide-react'

import { useLanguage } from '@/contexts/LanguageContext'
import { DASHBOARD_TAB_META, getDashboardTabLabels } from '@/components/admin/dashboard/tabMeta'
import type { CanonicalTabId } from '@/components/admin/dashboard/tabs'

interface MobileTabIndicatorProps {
  activeTab: string
}

export function MobileTabIndicator({ activeTab }: MobileTabIndicatorProps) {
  const { t } = useLanguage()
  const labels = getDashboardTabLabels(t)

  const typedActiveTab = activeTab as CanonicalTabId

  const config = DASHBOARD_TAB_META[typedActiveTab] || {
    icon: Package,
    mobileAccent: 'bg-slate-500',
    desktopAccent: '',
  }
  const Icon = config.icon
  const label = labels[typedActiveTab] || 'Tab'

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3 md:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {label}
          </h2>
          <p className="text-[10px] tracking-[0.08em] text-muted-foreground">AutoFood</p>
        </div>
      </div>
    </div>
  )
}
