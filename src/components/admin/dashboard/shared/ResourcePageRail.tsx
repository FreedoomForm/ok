import {
  Calculator,
  ChefHat,
  ClipboardList,
  DollarSign,
  FileText,
  Flame,
  History,
  MessageSquare,
  Package,
  Route,
  Settings,
  Shield,
  ShoppingBasket,
  Truck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { WorkspaceResourcePage } from './workspace-state'

export const RESOURCE_PAGE_ORDER: readonly WorkspaceResourcePage[] = [
  'chat',
  'settings',
  'ingredients',
  'cooking',
  'dishes',
  'groups',
  'sets',
  'finance',
  'contracts',
  'transactions',
  'orders',
  'routes',
  'admins',
  'couriers',
  'clients',
  'calculator',
]

const PAGE_ICONS: Record<WorkspaceResourcePage, LucideIcon> = {
  chat: MessageSquare,
  settings: Settings,
  ingredients: ShoppingBasket,
  cooking: ChefHat,
  dishes: Flame,
  groups: ClipboardList,
  sets: Package,
  finance: DollarSign,
  contracts: FileText,
  transactions: History,
  orders: ClipboardList,
  routes: Route,
  admins: Shield,
  couriers: Truck,
  clients: Users,
  calculator: Calculator,
}

export type ResourcePageRailProps = {
  activePage: WorkspaceResourcePage
  labels: Readonly<Record<WorkspaceResourcePage, string>>
  onSelect: (page: WorkspaceResourcePage) => void
  pages?: readonly WorkspaceResourcePage[]
}

export function ResourcePageRail({ activePage, labels, onSelect, pages = RESOURCE_PAGE_ORDER }: ResourcePageRailProps) {
  return (
    <nav aria-label="Resource pages" className="flex w-16 shrink-0 flex-col border-r border-border bg-background/95 py-2 lg:w-[76px]">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
        {pages.map((page) => {
          const Icon = PAGE_ICONS[page]
          const label = labels[page]
          return (
            <button
              key={page}
              type="button"
              aria-label={label}
              title={label}
              aria-current={activePage === page ? 'page' : undefined}
              onClick={() => onSelect(page)}
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-base border border-transparent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'hover:border-border hover:bg-muted hover:text-foreground',
                activePage === page && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
