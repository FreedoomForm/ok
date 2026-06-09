'use client'

import type { ComponentProps } from 'react'
import { RefreshCw } from 'lucide-react'

import { IconButton } from '@/components/ui/icon-button'

export function RefreshIconButton({
  label,
  onClick,
  isLoading,
  disabled,
  iconSize = 'md',
  variant = 'outline',
  className,
}: {
  label: string
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  iconSize?: 'sm' | 'md' | 'lg'
  variant?: ComponentProps<typeof IconButton>['variant']
  className?: string
}) {
  return (
    <IconButton
      label={label}
      onClick={onClick}
      disabled={Boolean(disabled) || Boolean(isLoading)}
      iconSize={iconSize}
      variant={variant}
      className={className}
    >
      <RefreshCw className={isLoading ? 'size-4 animate-spin' : 'size-4'} />
    </IconButton>
  )
}
