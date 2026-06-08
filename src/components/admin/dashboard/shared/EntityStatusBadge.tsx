'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/* ═════════════════════════════════════════════
   IA-first Dense UX — Entity Status Badge
   Law 13: статус = цвет + текст + иконка (dot)
   Law 66: семантика цвета
   
   Uses Badge semantic variants: success, warning, destructive, neutral
   ═════════════════════════════════════════════ */

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

const toneVariantMap: Record<StatusTone, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  neutral: 'neutral',
}

const dotColorMap: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral-400',
}

export function EntityStatusBadge({
  isActive,
  activeLabel,
  inactiveLabel,
  activeTone = 'success',
  inactiveTone = 'warning',
  showDot = true,
  className,
  onClick,
}: {
  isActive: boolean
  activeLabel: string
  inactiveLabel: string
  activeTone?: StatusTone
  inactiveTone?: StatusTone
  showDot?: boolean
  className?: string
  onClick?: () => void
}) {
  const tone = isActive ? activeTone : inactiveTone
  const variant = toneVariantMap[tone]

  return (
    <Badge
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5',
        onClick && 'cursor-pointer transition-opacity hover:opacity-85',
        className
      )}
      onClick={onClick}
    >
      {showDot && <span className={cn('size-1.5 rounded-full', dotColorMap[tone])} />}
      {isActive ? activeLabel : inactiveLabel}
    </Badge>
  )
}
