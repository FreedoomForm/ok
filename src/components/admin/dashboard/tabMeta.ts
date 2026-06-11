import type { LucideIcon } from 'lucide-react'
import { BarChart3, DollarSign, History, Package, Settings, Trash2, Users } from 'lucide-react'

import type { CanonicalTabId } from '@/components/admin/dashboard/tabs'

type DashboardTabCopySource = {
  admin: {
    orders: string
    clients: string
    admins: string
    bin: string
    statistics: string
    history: string
    interface: string
  }
  warehouse: {
    title: string
  }
  finance: {
    title: string
  }
}

export type DashboardTabMeta = {
  icon: LucideIcon
  desktopAccent: string
  mobileAccent: string
}

export const DASHBOARD_TAB_ORDER: CanonicalTabId[] = [
  'statistics',
  'orders',
  'clients',
  'admins',
  'warehouse',
  'finance',
  'history',
  'bin',
  'interface',
]

export const DASHBOARD_TAB_META: Record<CanonicalTabId, DashboardTabMeta> = {
  statistics: {
    icon: BarChart3,
    desktopAccent: 'data-[state=active]:text-neutral-800',
    mobileAccent: 'bg-neutral-800',
  },
  orders: {
    icon: Package,
    desktopAccent: 'data-[state=active]:text-neutral-600',
    mobileAccent: 'bg-neutral-600',
  },
  clients: {
    icon: Users,
    desktopAccent: 'data-[state=active]:text-neutral-500',
    mobileAccent: 'bg-neutral-500',
  },
  admins: {
    icon: Users,
    desktopAccent: 'data-[state=active]:text-slate-600',
    mobileAccent: 'bg-slate-500',
  },
  warehouse: {
    icon: Package,
    desktopAccent: 'data-[state=active]:text-neutral-800',
    mobileAccent: 'bg-neutral-800',
  },
  finance: {
    icon: DollarSign,
    desktopAccent: 'data-[state=active]:text-neutral-700',
    mobileAccent: 'bg-neutral-700',
  },
  history: {
    icon: History,
    desktopAccent: 'data-[state=active]:text-slate-600',
    mobileAccent: 'bg-slate-500',
  },
  bin: {
    icon: Trash2,
    desktopAccent: 'data-[state=active]:text-neutral-900',
    mobileAccent: 'bg-neutral-900',
  },
  interface: {
    icon: Settings,
    desktopAccent: 'data-[state=active]:text-slate-600',
    mobileAccent: 'bg-slate-500',
  },
}

export function getDashboardTabLabels(t: DashboardTabCopySource): Record<CanonicalTabId, string> {
  return {
    statistics: t.admin.statistics,
    orders: t.admin.orders,
    clients: t.admin.clients,
    admins: t.admin.admins,
    warehouse: t.warehouse.title,
    finance: t.finance.title,
    history: t.admin.history,
    bin: t.admin.bin,
    interface: t.admin.interface,
  }
}
