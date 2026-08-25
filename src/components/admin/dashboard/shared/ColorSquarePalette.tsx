'use client'

import { cn } from '@/lib/utils'

export const RESOURCE_COLOR_PALETTE = [
  '#c14e24',
  '#b8862b',
  '#255e52',
  '#2563eb',
  '#7c3aed',
  '#dc2626',
  '#0f766e',
  '#b45309',
] as const

type ColorSquarePaletteProps = {
  value: string
  onChange: (color: string) => void
  label: string
  colors?: readonly string[]
}

export function ColorSquarePalette({ value, onChange, label, colors = RESOURCE_COLOR_PALETTE }: ColorSquarePaletteProps) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            'size-6 rounded-sm border-2 transition-transform active:scale-[.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === color ? 'scale-110 border-foreground' : 'border-transparent',
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
