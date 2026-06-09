'use client'

import { CANONICAL_TABS, type CanonicalTabId } from '@/components/admin/dashboard/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function AllowedTabsPicker({
  value,
  onChange,
  idPrefix,
  copy,
}: {
  value: string[]
  onChange: (next: string[]) => void
  idPrefix: string
  copy: Record<CanonicalTabId, string>
}) {
  const toggle = (tab: CanonicalTabId, checked: boolean) => {
    const next = checked ? [...value, tab] : value.filter((t) => t !== tab)
    onChange(Array.from(new Set(next)))
  }

  return (
    <div className="space-y-2">
      {CANONICAL_TABS.map((tabId) => (
        <div key={tabId} className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}-${tabId}`}
            checked={value.includes(tabId)}
            onCheckedChange={(checked) => toggle(tabId, checked === true)}
          />
          <Label htmlFor={`${idPrefix}-${tabId}`} className="text-sm cursor-pointer">
            {copy[tabId]}
          </Label>
        </div>
      ))}
    </div>
  )
}
