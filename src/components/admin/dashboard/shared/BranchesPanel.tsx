'use client'

import { CheckIcon, GitBranchIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import type { WorkspaceResourcePage, WorkspaceSelection } from './workspace-state'

// R26 (§3.4 assumption): a "temporary branch" is a snapshot of the current
// page state (resource, search drafts, filter columns, selection) the user can
// safely experiment inside. Changes are not applied until the branch is
// applied. Branches live in memory + sessionStorage — no DB schema changes.

export type WorkspaceBranchSnapshot = {
  page: WorkspaceResourcePage
  searchTerm: string
  clientSearchTerm: string
  filterColumns: readonly string[]
  selection: WorkspaceSelection
}

export type WorkspaceBranchLogEntry = { at: string; text: string }

export type WorkspaceBranch = {
  id: string
  createdAt: string
  snapshot: WorkspaceBranchSnapshot
  log: WorkspaceBranchLogEntry[]
}

export const WORKSPACE_BRANCHES_STORAGE_KEY = 'workspace-temporary-branches:v1'

export function loadWorkspaceBranches(): WorkspaceBranch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_BRANCHES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WorkspaceBranch[]) : []
  } catch {
    return []
  }
}

export function saveWorkspaceBranches(branches: readonly WorkspaceBranch[]) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(WORKSPACE_BRANCHES_STORAGE_KEY, JSON.stringify(branches))
  } catch {
    // sessionStorage full/unavailable — branches stay in memory only
  }
}

export function snapshotFromState(input: {
  page: WorkspaceResourcePage
  searchTerm: string
  clientSearchTerm: string
  filterColumns: ReadonlySet<string>
  selection: WorkspaceSelection
}): WorkspaceBranchSnapshot {
  return {
    page: input.page,
    searchTerm: input.searchTerm,
    clientSearchTerm: input.clientSearchTerm,
    filterColumns: [...input.filterColumns],
    selection: Object.fromEntries(Object.entries(input.selection).map(([key, value]) => [key, [...value]])),
  }
}

export type BranchesPanelProps = {
  branches: readonly WorkspaceBranch[]
  currentSummary: string
  createLabel: string
  applyLabel: string
  discardLabel: string
  emptyLabel: string
  logLabel: string
  createdLabel: string
  onCreate: () => void
  onApply: (id: string) => void
  onDiscard: (id: string) => void
}

export function BranchesPanel({
  branches,
  currentSummary,
  createLabel,
  applyLabel,
  discardLabel,
  emptyLabel,
  logLabel,
  createdLabel,
  onCreate,
  onApply,
  onDiscard,
}: BranchesPanelProps) {
  const [, forceRender] = useState(0)
  // The panel is also mounted when a branch is active — re-render on demand.
  useEffect(() => {
    forceRender((current) => current + 1)
  }, [branches])

  return (
    <section
      aria-label={createLabel}
      data-reference-branches-panel="true"
      className="mx-auto w-full max-w-3xl space-y-3 p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <GitBranchIcon className="size-4 text-primary" aria-hidden="true" />
          {createLabel}
        </h2>
        <button
          type="button"
          data-reference-branch-create="true"
          onClick={onCreate}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          + {createdLabel}
        </button>
      </header>
      <p className="text-xs text-muted-foreground">{currentSummary}</p>
      {branches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {branches.map((branch) => (
            <li
              key={branch.id}
              data-reference-branch-item={branch.id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{branch.id.slice(-4)} · {branch.snapshot.page}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(branch.createdAt).toLocaleString()} · {branch.log.length} {logLabel}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    data-reference-branch-apply={branch.id}
                    onClick={() => onApply(branch.id)}
                    className={cn('flex items-center gap-1.5 rounded-lg border border-green-600 bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
                  >
                    <CheckIcon className="size-4" aria-hidden="true" />
                    {applyLabel}
                  </button>
                  <button
                    type="button"
                    data-reference-branch-discard={branch.id}
                    onClick={() => onDiscard(branch.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-600 bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <TrashIcon className="size-4" aria-hidden="true" />
                    {discardLabel}
                  </button>
                </div>
              </div>
              {branch.log.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border/60 pt-2" data-reference-branch-log={branch.id}>
                  {branch.log.slice(-8).map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className="text-xs text-muted-foreground">
                      {new Date(entry.at).toLocaleTimeString()} — {entry.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
