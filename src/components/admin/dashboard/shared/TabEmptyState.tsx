'use client'

import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

/* ═════════════════════════════════════════════
   IA-first Dense UX — Empty State Component
   Law 65: empty state должен объяснять, что здесь будет и как начать
   ═════════════════════════════════════════════ */

export function TabEmptyState({
  title = 'Nothing found',
  description = 'Adjust the filters or search query.',
  icon,
  action,
}: {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || <Search className="size-6" />}
      </div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
