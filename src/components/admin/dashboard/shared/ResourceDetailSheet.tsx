'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ResourceDetailSections,
  type ResourceDetailEntity,
  type ResourceDetailPayload,
} from '@/components/admin/dashboard/shared/ResourceDetailSections'

type ResourceDetailTarget = {
  entity: Exclude<ResourceDetailEntity, 'order'>
  id: string
  title: string
}

type ResourceDetailSheetProps = {
  open: boolean
  target: ResourceDetailTarget | null
  locale?: string
  onOpenChange: (open: boolean) => void
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  return String(value)
}

export function ResourceDetailSheet({ open, target, locale = 'ru-RU', onOpenChange }: ResourceDetailSheetProps) {
  const [detail, setDetail] = useState<ResourceDetailPayload | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !target) {
      setDetail(null)
      setError('')
      return
    }

    const controller = new AbortController()
    setDetail(null)
    setError('')
    setIsLoading(true)

    void fetch(`/api/admin/resource-details?entity=${target.entity}&id=${encodeURIComponent(target.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load details')
        return data as ResourceDetailPayload
      })
      .then((data) => setDetail(data))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Failed to load details')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [open, target])

  const resourceEntries = detail ? Object.entries(detail.resource).filter(([, value]) => displayValue(value) !== null) : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l bg-background sm:max-w-[760px]">
        <SheetHeader className="border-b px-4 py-4 text-left sm:px-6">
          <SheetTitle>{target?.title || 'Resource details'}</SheetTitle>
          <SheetDescription>Transactions, contracts, actions and related orders</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-4 sm:px-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading details...
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {detail && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {resourceEntries.map(([key, value]) => (
                  <div key={key} className="flex min-w-0 items-center justify-between gap-3 border-b py-2 text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="truncate text-right font-medium">{displayValue(value)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <ResourceDetailSections detail={detail} locale={locale} />
            </>
          )}
          {!isLoading && !error && !detail && <Badge variant="outline">No details</Badge>}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export type { ResourceDetailTarget }
