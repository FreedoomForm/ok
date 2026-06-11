'use client'

import { motion } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      key={activeTab}
      transition={{ duration: 0.2, ease: 'easeOut' }}
 className="sticky top-0 z-30 bg-card px-4 py-3 md:hidden"
    >
      <div className="flex items-center gap-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <motion.h2
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {label}
          </motion.h2>
          <p className="text-[10px] tracking-[0.08em] text-muted-foreground">AutoFood</p>
        </div>
      </div>
    </motion.div>
  )
}
