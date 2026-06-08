'use client'

import { Search } from 'lucide-react'
import type { Ref } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SearchPanel({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
  inputRef,
  className,
  inputClassName,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel?: string
  disabled?: boolean
  inputRef?: Ref<HTMLInputElement>
  className?: string
  inputClassName?: string
}) {
  return (
    <div className={cn('min-w-0 w-full max-w-[360px]', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          disabled={disabled}
 className={cn('h-9 bg-background pl-9', inputClassName)}
        />
      </div>
    </div>
  )
}
