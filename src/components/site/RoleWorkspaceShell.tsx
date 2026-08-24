'use client'

import { useMemo, useReducer, type ReactNode } from 'react'
import { ResourceLocalActionBar } from '@/components/admin/dashboard/shared/ResourceLocalActionBar'
import { ResourcePageRail } from '@/components/admin/dashboard/shared/ResourcePageRail'
import { UniversalCommandBar, type UniversalCommandLabels } from '@/components/admin/dashboard/shared/UniversalCommandBar'
import {
  UNIVERSAL_COMMANDS,
  createInitialWorkspaceState,
  reduceWorkspaceState,
  type UniversalCommand,
  type WorkspaceResourcePage,
} from '@/components/admin/dashboard/shared/workspace-state'
import { cn } from '@/lib/utils'

export type RoleWorkspaceShellProps = {
  activePage: WorkspaceResourcePage
  pages: readonly WorkspaceResourcePage[]
  pageLabels: Readonly<Record<WorkspaceResourcePage, string>>
  commandLabels: UniversalCommandLabels
  children: ReactNode
  className?: string
  onPageChange?: (page: WorkspaceResourcePage) => void
  onCommand?: (command: UniversalCommand) => void
}

const localLabels = {
  back: 'Back',
  clear: 'Clear',
  cancel: 'Cancel',
  confirm: 'Confirm',
  save: 'Save',
}

export function RoleWorkspaceShell({
  activePage,
  pages,
  pageLabels,
  commandLabels,
  children,
  className,
  onPageChange,
  onCommand,
}: RoleWorkspaceShellProps) {
  const [state, dispatch] = useReducer(reduceWorkspaceState, activePage, createInitialWorkspaceState)
  const disabledCommands = useMemo(() => new Set<UniversalCommand>(), [])
  const hasDraft = state.mode.kind !== 'normal' || state.keyState !== 'disarmed'
  const activeCommand: UniversalCommand | null = state.mode.kind === 'trash' ? 'trash' : state.mode.kind === 'create' ? 'create' : state.mode.kind === 'enabled' ? 'enable' : state.mode.kind === 'disabled' ? 'disable' : state.mode.kind === 'auto-sms' ? 'sms' : state.mode.kind === 'observation' ? 'realtime-ai' : state.mode.kind === 'action-history' ? 'edit' : state.mode.kind === 'temporary-branch' ? 'search' : null

  const handlePageChange = (page: WorkspaceResourcePage) => {
    dispatch({ type: 'set-page', page })
    onPageChange?.(page)
  }

  const handleCommand = (command: UniversalCommand) => {
    dispatch({ type: 'run-command', command })
    onCommand?.(command)
  }

  return (
    <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
      <div className="flex min-h-0 flex-1">
        <ResourcePageRail activePage={activePage} labels={pageLabels} pages={pages} onSelect={handlePageChange} />
        <main className="flex min-w-0 flex-1 flex-col">
          <UniversalCommandBar
            keyState={state.keyState}
            activeCommand={activeCommand}
            labels={commandLabels}
            disabledCommands={disabledCommands}
            onToggleKey={() => dispatch({ type: 'toggle-key' })}
            onCommand={handleCommand}
          />
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          <ResourceLocalActionBar
            labels={localLabels}
            hasDraft={hasDraft}
            canClear={hasDraft}
            onBack={() => dispatch({ type: 'cancel-mode' })}
            onClear={() => dispatch({ type: 'clear-selection', resource: activePage })}
            onCancel={() => dispatch({ type: 'cancel-mode' })}
            onConfirm={() => dispatch({ type: 'confirm-mode' })}
            onSave={() => dispatch({ type: 'save-mode' })}
          />
        </main>
      </div>
    </div>
  )
}

export const ROLE_WORKSPACE_COMMANDS = UNIVERSAL_COMMANDS
