'use client'

import type { ReactNode } from 'react'

import { Search } from 'lucide-react'

export function TabEmptyState({
  title = 'Nothing found',
  description = 'Try adjusting filters or search query.',
  icon,
}: {
  title?: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      {icon || <Search className="mx-auto mb-3 size-5 text-muted-foreground" />}
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
