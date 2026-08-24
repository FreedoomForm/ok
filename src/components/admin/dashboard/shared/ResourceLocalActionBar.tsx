import { ArrowLeft, Check, Eraser, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ResourceLocalActionLabels = {
  back: string
  clear: string
  cancel: string
  confirm: string
  save: string
}

export type ResourceLocalActionBarProps = {
  labels: ResourceLocalActionLabels
  hasDraft: boolean
  canClear: boolean
  onBack: () => void
  onClear: () => void
  onCancel: () => void
  onConfirm: () => void
  onSave: () => void
}

export function ResourceLocalActionBar({
  labels,
  hasDraft,
  canClear,
  onBack,
  onClear,
  onCancel,
  onConfirm,
  onSave,
}: ResourceLocalActionBarProps) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border bg-background/95 px-2 py-2 backdrop-blur-sm md:px-4">
      <Button type="button" variant="outline" size="sm" disabled={!hasDraft} onClick={onBack}>
        <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
        {labels.back}
      </Button>
      <div className="flex min-w-0 items-center gap-1.5">
        <Button type="button" variant="ghost" size="sm" disabled={!canClear} onClick={onClear}>
          <Eraser className="mr-1.5 size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.clear}</span>
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!hasDraft} onClick={onCancel}>
          <X className="mr-1.5 size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.cancel}</span>
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!hasDraft} onClick={onConfirm}>
          <Check className="mr-1.5 size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.confirm}</span>
        </Button>
        <Button type="button" size="sm" disabled={!hasDraft} onClick={onSave} className={cn(hasDraft && 'bg-primary text-primary-foreground')}>
          <Save className="mr-1.5 size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.save}</span>
        </Button>
      </div>
    </div>
  )
}
