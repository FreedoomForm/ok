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
    desktopAccent: 'data-[state=active]:text-emerald-600',
    mobileAccent: 'bg-emerald-500',
  },
  orders: {
    icon: Package,
    desktopAccent: 'data-[state=active]:text-teal-600',
    mobileAccent: 'bg-teal-500',
  },
  clients: {
    icon: Users,
    desktopAccent: 'data-[state=active]:text-cyan-600',
    mobileAccent: 'bg-cyan-500',
  },
  admins: {
    icon: Users,
    desktopAccent: 'data-[state=active]:text-amber-600',
    mobileAccent: 'bg-amber-500',
  },
  warehouse: {
    icon: Package,
    desktopAccent: 'data-[state=active]:text-emerald-600',
    mobileAccent: 'bg-emerald-500',
  },
  finance: {
    icon: DollarSign,
    desktopAccent: 'data-[state=active]:text-lime-600',
    mobileAccent: 'bg-lime-500',
  },
  history: {
    icon: History,
    desktopAccent: 'data-[state=active]:text-yellow-600',
    mobileAccent: 'bg-yellow-500',
  },
  bin: {
    icon: Trash2,
    desktopAccent: 'data-[state=active]:text-rose-600',
    mobileAccent: 'bg-rose-500',
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
