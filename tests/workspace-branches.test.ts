import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canRunUniversalCommand,
  createInitialWorkspaceState,
  reduceWorkspaceState,
  type WorkspaceSelection,
} from '../src/components/admin/dashboard/shared/workspace-state'
import { snapshotFromState } from '../src/components/admin/dashboard/shared/BranchesPanel'

// C2: universal creation (R24), action history (R25) and temporary branches
// (R26) ride on the workspace reducer: key+plus / key+edit / key+search must
// enter the dedicated modes from any page, and the branch snapshot captures
// the page-local state that later gets restored on apply.

test('key+plus from any page enters the universal creation mode scoped to that page', () => {
  const orders = createInitialWorkspaceState('orders')
  const armed = reduceWorkspaceState(orders, { type: 'toggle-key' })
  const create = reduceWorkspaceState(armed, { type: 'run-command', command: 'create' })

  assert.deepEqual(create.mode, { kind: 'create', resource: 'orders' })
  assert.equal(create.keyState, 'active')

  const chat = reduceWorkspaceState(create, { type: 'set-page', page: 'chat' })
  // The key stays active through page changes; the local cancel action is the
  // honest exit path out of the creation mode.
  assert.equal(chat.keyState, 'active')
  const exited = reduceWorkspaceState(chat, { type: 'cancel-mode' })
  assert.equal(exited.keyState, 'disarmed')
  assert.deepEqual(exited.mode, { kind: 'normal' })
})

test('key+search enters temporary-branch mode and key+edit enters scoped action history', () => {
  const clients = createInitialWorkspaceState('clients')
  const selected = reduceWorkspaceState(clients, { type: 'select', resource: 'clients', id: 'client-1' })
  const armed = reduceWorkspaceState(selected, { type: 'toggle-key' })

  const branch = reduceWorkspaceState(armed, { type: 'run-command', command: 'search' })
  assert.deepEqual(branch.mode, { kind: 'temporary-branch' })
  assert.deepEqual(branch.selection.clients, ['client-1'])

  // Exit the branch mode (active → armed → disarmed), then re-arm for the
  // scoped history mode.
  const exited = reduceWorkspaceState(branch, { type: 'toggle-key' })
  const disarmed = reduceWorkspaceState(exited, { type: 'toggle-key' })
  const reArmed = reduceWorkspaceState(disarmed, { type: 'toggle-key' })
  const edit = reduceWorkspaceState(reArmed, { type: 'run-command', command: 'edit' })
  assert.deepEqual(edit.mode, { kind: 'action-history', resource: 'clients' })
})

test('auto-SMS off keeps the key active and reports the disabled effect', () => {
  const state = createInitialWorkspaceState('orders')
  const armed = reduceWorkspaceState(state, { type: 'toggle-key' })
  const enabled = reduceWorkspaceState(armed, { type: 'run-command', command: 'sms' })
  assert.deepEqual(enabled.mode, { kind: 'auto-sms', enabled: true })
  assert.equal(enabled.keyState, 'active')

  const disabled = reduceWorkspaceState(enabled, { type: 'run-command', command: 'sms' })
  assert.deepEqual(disabled.mode, { kind: 'auto-sms', enabled: false })
  assert.equal(disabled.keyState, 'active')
  assert.deepEqual(disabled.effect, { type: 'internal-auto-sms-disabled' })
  // The key stays engaged: commands still run through the armed-mode grammar.
  assert.equal(canRunUniversalCommand(disabled, 'sms'), true)
})

test('branch snapshot captures page state and restores it verbatim', () => {
  const selection: { clients?: string[]; chat?: string[] } = { clients: ['c1', 'c2'], chat: ['contact-9'] }
  const filterColumns = new Set(['name', 'status'])
  const snapshot = snapshotFromState({
    page: 'clients',
    searchTerm: 'guruch',
    clientSearchTerm: 'ali',
    filterColumns,
    selection,
  })

  assert.deepEqual(snapshot.selection, { clients: ['c1', 'c2'], chat: ['contact-9'] })
  // Snapshot copies are detached from the live state.
  selection.clients = ['mutated']
  assert.deepEqual(snapshot.selection.clients, ['c1', 'c2'])
  assert.equal(snapshot.searchTerm, 'guruch')
  assert.equal(snapshot.clientSearchTerm, 'ali')
  assert.deepEqual(snapshot.filterColumns, ['name', 'status'])
  assert.equal(snapshot.page, 'clients')
})
