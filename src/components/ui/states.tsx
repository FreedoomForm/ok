'use client'

import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'

/* ═════════════════════════════════════════════
   IA-first Dense UX — Reusable UI State Components
   Borderless, design-token-based, accessible.
   ═════════════════════════════════════════════ */

// ─── Loading: Table skeleton ────────────────────────

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="w-full space-y-0" role="status" aria-label="Loading data">
      {/* Header row */}
      <div className="flex gap-3 px-3 py-2 bg-[var(--color-bg-muted)] rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-3 px-3 py-2 border-b border-b-[var(--color-border-subtle)]"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`${rowIdx}-${colIdx}`}
              className="h-4 flex-1"
              style={{ opacity: 1 - rowIdx * 0.08 }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

// ─── Loading: Card skeleton ─────────────────────────

export function CardSkeleton() {
  return (
    <div
      className="rounded-xl bg-[var(--color-bg-soft)] p-6 space-y-3"
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 text-[var(--color-text-muted)] opacity-40">
        {icon || <Inbox className="size-10" strokeWidth={1.5} />}
      </div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-[320px]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── Error state ────────────────────────────────────

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 text-[var(--color-error)] opacity-60">
        <AlertCircle className="size-10" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-[400px]">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 gap-2"
          onClick={onRetry}
        >
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}
