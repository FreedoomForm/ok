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

const pageControl =
  'flex size-14 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted-foreground shadow-none transition-colors duration-150 active:scale-[.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ResourcePageRail({ activePage, labels, onSelect, pages = RESOURCE_PAGE_ORDER }: ResourcePageRailProps) {
  return (
    <nav aria-label="Resource pages" data-reference-page-rail="true" className="flex w-16 shrink-0 flex-col border-r border-border/40 bg-background py-2 lg:w-[72px]">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1">
        {pages.map((page) => {
          const Icon = PAGE_ICONS[page]
          const label = labels[page]
          return (
            <button
              key={page}
              type="button"
              role="tab"
              aria-label={label}
              title={label}
              aria-selected={activePage === page}
              aria-current={activePage === page ? 'page' : undefined}
              data-reference-page={page}
              onClick={() => onSelect(page)}
              className={cn(
                pageControl,
                'hover:border-primary/20 hover:bg-accent hover:text-foreground',
                activePage === page && 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
              )}
            >
              <Icon className="size-7" strokeWidth={1.8} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
