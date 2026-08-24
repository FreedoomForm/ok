import {
  Eye,
  KeyRound,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UNIVERSAL_COMMANDS, type KeyState, type UniversalCommand } from './workspace-state'

const COMMAND_ICONS: Record<UniversalCommand, LucideIcon> = {
  search: Search,
  create: Plus,
  enable: Power,
  disable: PowerOff,
  trash: Trash2,
  edit: Pencil,
  sms: MessageSquare,
  'realtime-ai': Eye,
}

export type UniversalCommandLabels = Readonly<Record<UniversalCommand | 'key', string>>

export type UniversalCommandBarProps = {
  keyState: KeyState
  activeCommand?: UniversalCommand | null
  labels: UniversalCommandLabels
  disabledCommands?: ReadonlySet<UniversalCommand>
  onToggleKey: () => void
  onCommand: (command: UniversalCommand) => void
}

export function UniversalCommandBar({
  keyState,
  activeCommand = null,
  labels,
  disabledCommands = new Set<UniversalCommand>(),
  onToggleKey,
  onCommand,
}: UniversalCommandBarProps) {
  const keyIsArmed = keyState !== 'disarmed'
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 py-2 lg:gap-2 lg:px-4">
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={labels.key}
        title={labels.key}
        aria-pressed={keyIsArmed}
        onClick={onToggleKey}
        className={cn(
          'size-10 shrink-0 border-2',
          keyState === 'disarmed' && 'border-red-500 text-red-600',
          keyState === 'armed' && 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
          keyState === 'active' && 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
        )}
      >
        <KeyRound className="size-5" aria-hidden="true" />
      </Button>
      {UNIVERSAL_COMMANDS.map((command) => {
        const Icon = COMMAND_ICONS[command]
        const isActive = command === activeCommand
        return (
          <Button
            key={command}
            type="button"
            size="icon"
            variant="outline"
            aria-label={labels[command]}
            title={labels[command]}
            aria-pressed={isActive}
            disabled={disabledCommands.has(command)}
            onClick={() => onCommand(command)}
            className={cn(
              'size-10 shrink-0 border-2',
              isActive && 'border-primary bg-primary text-primary-foreground',
              command === 'disable' && isActive && 'border-red-500 bg-red-500 text-white',
              command === 'enable' && isActive && 'border-green-500 bg-green-500 text-white',
              command === 'sms' && isActive && 'border-green-500 bg-green-500 text-white',
              command === 'trash' && isActive && 'border-red-500 bg-red-500 text-white',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </Button>
        )
      })}
    </div>
  )
}
