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
  interactionLocked?: boolean
  onToggleKey: () => void
  onCommand: (command: UniversalCommand) => void
}

const commandBase =
  'h-14 w-14 shrink-0 rounded-[8px] border border-transparent bg-card p-0 text-card-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45'

function commandTone(command: UniversalCommand, active: boolean) {
  if (!active) {
    if (command === 'create') return 'text-primary hover:bg-primary/10'
    if (command === 'search') return 'text-primary hover:bg-primary/10'
    if (command === 'sms') return 'text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/30'
    return 'hover:bg-accent'
  }

  if (command === 'enable' || command === 'sms') {
    return 'border-green-600 bg-green-600 text-white hover:bg-green-700'
  }
  if (command === 'disable' || command === 'trash') {
    return 'border-red-600 bg-red-600 text-white hover:bg-red-700'
  }
  if (command === 'search') {
    return 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
  }
  return 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
}

function keyTone(keyState: KeyState) {
  if (keyState === 'armed') return 'border-green-600 bg-green-600 text-white hover:bg-green-700'
  if (keyState === 'active') return 'border-red-600 bg-red-600 text-white hover:bg-red-700'
  return 'border-transparent bg-card text-primary hover:bg-accent'
}

export function UniversalCommandBar({
  keyState,
  activeCommand = null,
  labels,
  disabledCommands = new Set<UniversalCommand>(),
  interactionLocked = false,
  onToggleKey,
  onCommand,
}: UniversalCommandBarProps) {
  return (
    <div
      role="toolbar"
      aria-label={labels.key}
      data-reference-command-strip="true"
      className="sticky top-0 z-30 flex min-w-0 items-center gap-2 overflow-x-auto border-b border-border/60 bg-background/95 px-2 py-2 backdrop-blur lg:gap-2 lg:px-4"
    >
      <button
        type="button"
        aria-label={labels.key}
        title={labels.key}
        aria-pressed={keyState !== 'disarmed'}
        data-reference-command="key"
        onClick={onToggleKey}
        className={cn(commandBase, keyTone(keyState))}
      >
        <KeyRound className="size-7" strokeWidth={1.8} aria-hidden="true" />
      </button>

      {UNIVERSAL_COMMANDS.map((command) => {
        const Icon = COMMAND_ICONS[command]
        const isActive = command === activeCommand
        return (
          <button
            key={command}
            type="button"
            aria-label={labels[command]}
            title={labels[command]}
            aria-pressed={isActive}
            data-reference-command={command}
            disabled={interactionLocked || disabledCommands.has(command)}
            onClick={() => onCommand(command)}
            className={cn(commandBase, commandTone(command, isActive))}
          >
            <Icon className="size-7" strokeWidth={1.8} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
