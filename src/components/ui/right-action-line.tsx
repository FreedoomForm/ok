'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Right-aligned single-line action row.
 * - Keeps items on one line (no wrap) and enables horizontal scrolling on overflow.
 * - Visual order is right-to-left (small/icon buttons "first" sit on the far right).
 *   Render children in priority order: smallest -> largest (e.g. refresh, calendar, search).
 */
export function RightActionLine({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
}) {
  return (
    <div
      className={cn(
        // `min-w-0` is critical when this sits in a flex row; otherwise the scroller can overflow the viewport on mobile.
        'no-scrollbar scroll-right ml-auto w-full max-w-full min-w-0 overflow-x-auto touch-pan-x',
        className
      )}
    >
      <div
        className={cn(
          'flex w-max flex-nowrap flex-row-reverse items-center justify-end gap-2',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
