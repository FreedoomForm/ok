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

const localButton = 'h-11 rounded-lg border px-3 shadow-none transition-colors duration-150 active:scale-[.95]'

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
    <div data-reference-local-actions className="sticky bottom-0 z-20 mt-auto flex shrink-0 items-center justify-between gap-2 bg-background px-2 py-2 md:px-4">
      <Button
        type="button"
        variant="ghost"
        aria-label={labels.back}
        disabled={!hasDraft}
        onClick={onBack}
        className={cn(localButton, 'border-transparent text-primary hover:bg-accent')}
      >
        <ArrowLeft className="mr-1.5 size-[18px]" aria-hidden="true" />
        {labels.back}
      </Button>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          aria-label={labels.clear}
          disabled={!canClear}
          onClick={onClear}
          className={cn(localButton, 'border-transparent text-muted-foreground hover:bg-accent')}
        >
          <Eraser className="mr-1.5 size-[18px]" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.clear}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label={labels.cancel}
          disabled={!hasDraft}
          onClick={onCancel}
          className={cn(localButton, 'border-input text-foreground hover:bg-accent')}
        >
          <X className="mr-1.5 size-[18px]" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.cancel}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label={labels.confirm}
          disabled={!hasDraft}
          onClick={onConfirm}
          className={cn(localButton, 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700')}
        >
          <Check className="mr-1.5 size-[18px]" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.confirm}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label={labels.save}
          disabled={!hasDraft}
          onClick={onSave}
          className={cn(localButton, 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}
        >
          <Save className="mr-1.5 size-[18px]" aria-hidden="true" />
          <span className="hidden sm:inline">{labels.save}</span>
        </Button>
      </div>
    </div>
  )
}
