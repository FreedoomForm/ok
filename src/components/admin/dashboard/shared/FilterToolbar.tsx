'use client'

import type { ReactNode, Ref } from 'react'
import { SearchPanel } from '@/components/ui/search-panel'

export function FilterToolbar({
  searchValue,
  searchPlaceholder,
  searchAriaLabel,
  onSearchChange,
  inputRef,
  children,
}: {
  searchValue: string
  searchPlaceholder: string
  searchAriaLabel?: string
  onSearchChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
  children?: ReactNode
}) {
  return (
 <div className="grid gap-3 rounded-xl bg-card p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <SearchPanel
        inputRef={inputRef}
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        ariaLabel={searchAriaLabel || searchPlaceholder}
        className="max-w-none"
      />
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
