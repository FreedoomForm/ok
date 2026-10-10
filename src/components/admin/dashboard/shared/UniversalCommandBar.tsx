import {
  CalendarDays,
  Eye,
  Filter,
  KeyRound,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  X,
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
  /** R16: controlled open state of the in-place search expansion (popover). */
  searchPopoverOpen?: boolean
  onSearchPopoverOpenChange?: (open: boolean) => void
  /** R16: sub-actions of the round search button — open the Filter/Calendar windows. */
  onSearchSubcommand?: (subcommand: 'filter' | 'calendar') => void
  searchSubcommandLabels?: { filter: string; calendar: string }
  onToggleKey: () => void
  onCommand: (command: UniversalCommand) => void
}

const commandBase =
  'h-14 w-14 shrink-0 rounded-[8px] border border-transparent bg-card p-0 text-card-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45'

// R16: the search button is the only round universal button (reference app:
// "kruglaya knopka, kotoraya raskrivayetsa").
const commandShape: Partial<Record<UniversalCommand, string>> = {
  search: 'rounded-full',
}

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
  searchPopoverOpen = false,
  onSearchPopoverOpenChange,
  onSearchSubcommand,
  searchSubcommandLabels,
  onToggleKey,
  onCommand,
}: UniversalCommandBarProps) {
  const searchPopoverEnabled = typeof onSearchSubcommand === 'function'
  return (
    <div
      role="toolbar"
      aria-label={labels.key}
      data-reference-command-strip="true"
      className="sticky top-0 z-30 flex min-w-0 items-center gap-2 overflow-x-auto bg-background px-2 py-2 lg:gap-2 lg:px-4"
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
        const isSearch = command === 'search'
        return (
          <div key={command} className="relative shrink-0">
            <button
              type="button"
              aria-label={labels[command]}
              title={labels[command]}
              aria-pressed={isSearch && searchPopoverOpen ? true : isActive}
              aria-expanded={isSearch && searchPopoverEnabled ? searchPopoverOpen : undefined}
              data-reference-command={command}
              disabled={interactionLocked || disabledCommands.has(command)}
              onClick={() => {
                if (isSearch && searchPopoverEnabled && !interactionLocked && !disabledCommands.has(command)) {
                  onSearchPopoverOpenChange?.(!searchPopoverOpen)
                  return
                }
                onCommand(command)
              }}
              className={cn(commandBase, commandShape[command], commandTone(command, isActive))}
            >
              <Icon className="size-7" strokeWidth={1.8} aria-hidden="true" />
            </button>
            {isSearch && searchPopoverEnabled && searchPopoverOpen ? (
              <div
                role="menu"
                aria-label={labels.search}
                data-reference-search-popover="true"
                className="absolute left-0 top-[calc(100%+6px)] z-40 flex w-44 flex-col gap-1 rounded-lg border border-border bg-card p-1.5 shadow-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  data-reference-search-action="filter"
                  onClick={() => onSearchSubcommand?.('filter')}
                  className="flex min-h-10 items-center gap-2 rounded-md px-2.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Filter className="size-4" aria-hidden="true" />
                  {searchSubcommandLabels?.filter ?? 'Фильтр'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-reference-search-action="calendar"
                  onClick={() => onSearchSubcommand?.('calendar')}
                  className="flex min-h-10 items-center gap-2 rounded-md px-2.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {searchSubcommandLabels?.calendar ?? 'Календарь'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-reference-search-action="close"
                  onClick={() => onSearchPopoverOpenChange?.(false)}
                  className="flex min-h-8 items-center justify-end gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
