'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ICON_BUTTON_SIZE = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
} as const

export type IconButtonProps = Omit<ButtonProps, 'size' | 'children'> & {
  label: string
  children: React.ReactNode
  iconSize?: keyof typeof ICON_BUTTON_SIZE
}

type ButtonProps = React.ComponentProps<typeof Button>

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, className, iconSize = 'md', ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      size="icon"
      aria-label={label}
      title={label}
      className={cn(ICON_BUTTON_SIZE[iconSize], className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )
})
