export const WORKSPACE_RESOURCE_PAGES = [
  'chat',
  'settings',
  'ingredients',
  'cooking',
  'dishes',
  'groups',
  'sets',
  'finance',
  'contracts',
  'transactions',
  'orders',
  'routes',
  'admins',
  'couriers',
  'clients',
  'calculator',
] as const

export type WorkspaceResourcePage = (typeof WORKSPACE_RESOURCE_PAGES)[number]

export const UNIVERSAL_COMMANDS = [
  'search',
  'create',
  'enable',
  'disable',
  'trash',
  'edit',
  'sms',
  'realtime-ai',
] as const

export type UniversalCommand = (typeof UNIVERSAL_COMMANDS)[number]
export type KeyState = 'disarmed' | 'armed' | 'active'

export type WorkspaceMode =
  | { kind: 'normal' }
  | { kind: 'trash' }
  | { kind: 'enabled' }
  | { kind: 'disabled' }
  | { kind: 'action-history'; resource: WorkspaceResourcePage }
  | { kind: 'temporary-branch' }
  | { kind: 'auto-sms'; enabled: boolean }
  | { kind: 'create'; resource: WorkspaceResourcePage }
  | { kind: 'observation' }

export type WorkspaceEffect =
  | { type: 'open-search-page' }
  | { type: 'open-create-page'; resource: WorkspaceResourcePage }
  | { type: 'open-calendar-action'; command: 'enable' | 'disable' }
  | { type: 'open-trash-page' }
  | { type: 'open-edit-page'; resource: WorkspaceResourcePage }
  | { type: 'manual-internal-message-preview'; resource: WorkspaceResourcePage }
  | { type: 'open-audio-page' }
  | { type: 'restore-trash-selection'; resource: WorkspaceResourcePage }
  | { type: 'internal-auto-sms-enabled' }
  | { type: 'internal-auto-sms-disabled' }
  | { type: 'blocked-observation-command'; command: UniversalCommand }

export type WorkspaceSelection = Readonly<
  Partial<Record<WorkspaceResourcePage, readonly string[]>>
>

export type WorkspaceState = {
  page: WorkspaceResourcePage
  keyState: KeyState
  mode: WorkspaceMode
  selection: WorkspaceSelection
  effect: WorkspaceEffect | null
}

export type WorkspaceAction =
  | { type: 'toggle-key' }
  | { type: 'run-command'; command: UniversalCommand }
  | { type: 'select'; resource: WorkspaceResourcePage; id: string; selected?: boolean }
  | { type: 'reconcile-selection'; resource: WorkspaceResourcePage; visibleIds: readonly string[] }
  | { type: 'set-page'; page: WorkspaceResourcePage }
  | { type: 'clear-effect' }
  | { type: 'clear-selection'; resource: WorkspaceResourcePage }
  | { type: 'cancel-mode' }
  | { type: 'save-mode' }
  | { type: 'confirm-mode' }

function selectedIds(state: WorkspaceState, resource = state.page): readonly string[] {
  return state.selection[resource] ?? []
}

function withEffect(state: WorkspaceState, effect: WorkspaceEffect | null): WorkspaceState {
  return { ...state, effect }
}

function withSelection(
  state: WorkspaceState,
  resource: WorkspaceResourcePage,
  ids: readonly string[],
): WorkspaceState {
  return { ...state, selection: { ...state.selection, [resource]: ids }, effect: null }
}

function exitMode(state: WorkspaceState): WorkspaceState {
  return { ...state, keyState: 'disarmed', mode: { kind: 'normal' }, effect: null }
}

function commandNeedsSelection(command: UniversalCommand): boolean {
  return command === 'enable' || command === 'disable' || command === 'edit' || command === 'sms'
}

export function createInitialWorkspaceState(page: WorkspaceResourcePage = 'orders'): WorkspaceState {
  return {
    page,
    keyState: 'disarmed',
    mode: { kind: 'normal' },
    selection: {},
    effect: null,
  }
}

export function canRunUniversalCommand(
  state: WorkspaceState,
  command: UniversalCommand,
): boolean {
  if (state.mode.kind === 'observation') return false
  if (command === 'trash' && state.mode.kind !== 'trash' && state.keyState !== 'armed') return false
  const keyArmedMode = state.keyState === 'armed' || (command === 'sms' && state.mode.kind === 'auto-sms' && state.keyState === 'active')
  if (commandNeedsSelection(command) && selectedIds(state).length === 0 && !keyArmedMode) {
    return false
  }
  return true
}

export function reduceWorkspaceState(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'toggle-key': {
      if (state.mode.kind === 'observation') {
        return { ...state, keyState: 'disarmed', mode: { kind: 'normal' }, effect: null }
      }
      if (state.keyState === 'disarmed') return { ...state, keyState: 'armed', effect: null }
      if (state.keyState === 'active') return { ...state, keyState: 'armed', effect: null }
      return { ...state, keyState: 'disarmed', effect: null }
    }
    case 'run-command': {
      const { command } = action
      if (!canRunUniversalCommand(state, command)) {
        return withEffect(state, state.mode.kind === 'observation'
          ? { type: 'blocked-observation-command', command }
          : null)
      }

      if (command === 'trash') {
        if (state.mode.kind === 'trash' && state.keyState === 'armed') {
          return { ...state, keyState: 'disarmed', mode: { kind: 'normal' }, effect: null }
        }
        return { ...state, keyState: 'active', mode: { kind: 'trash' }, effect: null }
      }

      if (command === 'create' && state.mode.kind === 'trash') {
        return {
          ...state,
          keyState: 'disarmed',
          mode: { kind: 'normal' },
          effect: { type: 'restore-trash-selection', resource: state.page },
        }
      }

      if (command === 'sms') {
        if (state.mode.kind === 'auto-sms' && state.keyState === 'active') {
          return {
            ...state,
            keyState: 'active',
            mode: { kind: 'auto-sms', enabled: false },
            effect: { type: 'internal-auto-sms-disabled' },
          }
        }
        if (state.keyState === 'armed') {
          return {
            ...state,
            keyState: 'active',
            mode: { kind: 'auto-sms', enabled: true },
            effect: { type: 'internal-auto-sms-enabled' },
          }
        }
        return withEffect(state, { type: 'manual-internal-message-preview', resource: state.page })
      }

      if (command === 'realtime-ai') {
        if (state.keyState === 'armed') {
          return { ...state, keyState: 'active', mode: { kind: 'observation' }, effect: null }
        }
        return withEffect(state, { type: 'open-audio-page' })
      }

      if (command === 'search') {
        if (state.keyState === 'armed') {
          return { ...state, keyState: 'active', mode: { kind: 'temporary-branch' }, effect: null }
        }
        return withEffect(state, { type: 'open-search-page' })
      }

      if (command === 'create') {
        if (state.keyState === 'armed') {
          return { ...state, keyState: 'active', mode: { kind: 'create', resource: state.page }, effect: null }
        }
        return withEffect(state, { type: 'open-create-page', resource: state.page })
      }

      if (command === 'edit') {
        if (state.keyState === 'armed') {
          return { ...state, keyState: 'active', mode: { kind: 'action-history', resource: state.page }, effect: null }
        }
        return withEffect(state, { type: 'open-edit-page', resource: state.page })
      }

      if (command === 'enable' || command === 'disable') {
        const kind = command === 'enable' ? 'enabled' : 'disabled'
        if (state.keyState === 'armed') {
          return { ...state, keyState: 'active', mode: { kind }, effect: null }
        }
        return withEffect(state, { type: 'open-calendar-action', command })
      }

      return state
    }
    case 'select': {
      const current = new Set(selectedIds(state, action.resource))
      const shouldSelect = action.selected ?? !current.has(action.id)
      if (shouldSelect) current.add(action.id)
      else current.delete(action.id)
      return withSelection(state, action.resource, [...current])
    }
    case 'reconcile-selection': {
      const visible = new Set(action.visibleIds)
      return withSelection(
        state,
        action.resource,
        selectedIds(state, action.resource).filter((id) => visible.has(id)),
      )
    }
    case 'set-page':
      return { ...state, page: action.page, effect: null }
    case 'clear-effect':
      return { ...state, effect: null }
    case 'clear-selection':
      return withSelection(state, action.resource, [])
    case 'cancel-mode':
    case 'save-mode':
    case 'confirm-mode':
      return exitMode(state)
  }
}
