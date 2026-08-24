import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createInitialWorkspaceState,
  reduceWorkspaceState,
  canRunUniversalCommand,
  type WorkspaceResourcePage,
} from '@/components/admin/dashboard/shared/workspace-state'

const clients: WorkspaceResourcePage = 'clients'

function state() {
  return createInitialWorkspaceState(clients)
}

test('key arms green before a special universal command enters a mode', () => {
  const armed = reduceWorkspaceState(state(), { type: 'toggle-key' })
  assert.equal(armed.keyState, 'armed')
  assert.equal(armed.mode.kind, 'normal')

  const trash = reduceWorkspaceState(armed, { type: 'run-command', command: 'trash' })
  assert.equal(trash.keyState, 'active')
  assert.deepEqual(trash.mode, { kind: 'trash' })
})

test('trash plus restores selected rows without clearing selection', () => {
  const selected = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const armed = reduceWorkspaceState(selected, { type: 'toggle-key' })
  const trash = reduceWorkspaceState(armed, { type: 'run-command', command: 'trash' })
  const restored = reduceWorkspaceState(trash, { type: 'run-command', command: 'create' })

  assert.deepEqual(restored.selection[clients], ['client-1'])
  assert.deepEqual(restored.mode, { kind: 'normal' })
})

test('returning from trash keeps normal selection and requires key again', () => {
  const selected = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const trash = reduceWorkspaceState(
    reduceWorkspaceState(selected, { type: 'toggle-key' }),
    { type: 'run-command', command: 'trash' },
  )
  const unarmed = reduceWorkspaceState(trash, { type: 'toggle-key' })
  const normal = reduceWorkspaceState(unarmed, { type: 'run-command', command: 'trash' })

  assert.equal(unarmed.keyState, 'armed')
  assert.deepEqual(normal.mode, { kind: 'normal' })
  assert.equal(normal.keyState, 'disarmed')
  assert.deepEqual(normal.selection[clients], ['client-1'])
})

test('SMS uses key state to distinguish manual internal message from auto mode toggle', () => {
  const selected = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const manual = reduceWorkspaceState(selected, { type: 'run-command', command: 'sms' })
  assert.deepEqual(manual.effect, { type: 'manual-internal-message-preview', resource: clients })
  assert.equal(manual.mode.kind, 'normal')

  const armed = reduceWorkspaceState(selected, { type: 'toggle-key' })
  const auto = reduceWorkspaceState(armed, { type: 'run-command', command: 'sms' })
  assert.deepEqual(auto.mode, { kind: 'auto-sms', enabled: true })
  assert.deepEqual(auto.effect, { type: 'internal-auto-sms-enabled' })
})

test('command availability rejects actions without selection and observation mode blocks mutation commands', () => {
  assert.equal(canRunUniversalCommand(state(), 'edit'), false)
  const observed = reduceWorkspaceState(
    reduceWorkspaceState(state(), { type: 'toggle-key' }),
    { type: 'run-command', command: 'realtime-ai' },
  )
  assert.deepEqual(observed.mode, { kind: 'observation' })
  assert.equal(canRunUniversalCommand(observed, 'edit'), false)
  assert.equal(canRunUniversalCommand(observed, 'search'), false)
})

test('selection reconciliation removes only ids that are no longer visible', () => {
  const selected = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const selectedAgain = reduceWorkspaceState(selected, { type: 'select', resource: clients, id: 'client-2' })
  const reconciled = reduceWorkspaceState(selectedAgain, {
    type: 'reconcile-selection',
    resource: clients,
    visibleIds: ['client-2', 'client-3'],
  })
  assert.deepEqual(reconciled.selection[clients], ['client-2'])
})

test('key cycles through disarmed, armed, active, armed, disarmed states', () => {
  const armed = reduceWorkspaceState(state(), { type: 'toggle-key' })
  const active = reduceWorkspaceState(armed, { type: 'run-command', command: 'search' })
  const rearmed = reduceWorkspaceState(active, { type: 'toggle-key' })
  const disarmed = reduceWorkspaceState(rearmed, { type: 'toggle-key' })

  assert.equal(armed.keyState, 'armed')
  assert.equal(active.keyState, 'active')
  assert.deepEqual(active.mode, { kind: 'temporary-branch' })
  assert.equal(rearmed.keyState, 'armed')
  assert.equal(disarmed.keyState, 'disarmed')
})

test('key-armed enable, disable, and edit commands enter modes before rows are selected', () => {
  const armed = reduceWorkspaceState(state(), { type: 'toggle-key' })
  const enabled = reduceWorkspaceState(armed, { type: 'run-command', command: 'enable' })
  assert.deepEqual(enabled.mode, { kind: 'enabled' })
  assert.equal(enabled.keyState, 'active')

  const disabled = reduceWorkspaceState(armed, { type: 'run-command', command: 'disable' })
  assert.deepEqual(disabled.mode, { kind: 'disabled' })

  const edited = reduceWorkspaceState(armed, { type: 'run-command', command: 'edit' })
  assert.deepEqual(edited.mode, { kind: 'action-history', resource: clients })
})

test('page changes do not clear selection and page-local effects can be consumed once', () => {
  const selected = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const moved = reduceWorkspaceState(selected, { type: 'set-page', page: 'orders' })
  assert.equal(moved.page, 'orders')
  assert.deepEqual(moved.selection[clients], ['client-1'])

  const searched = reduceWorkspaceState(moved, { type: 'run-command', command: 'search' })
  assert.deepEqual(searched.effect, { type: 'open-search-page' })
  const cleared = reduceWorkspaceState(searched, { type: 'clear-effect' })
  assert.equal(cleared.effect, null)
})

test('auto-SMS toggles from enabled to disabled without losing the active mode', () => {
  const enabled = reduceWorkspaceState(
    reduceWorkspaceState(state(), { type: 'toggle-key' }),
    { type: 'run-command', command: 'sms' },
  )
  const disabled = reduceWorkspaceState(enabled, { type: 'run-command', command: 'sms' })

  assert.deepEqual(disabled.mode, { kind: 'auto-sms', enabled: false })
  assert.equal(disabled.keyState, 'active')
  assert.deepEqual(disabled.effect, { type: 'internal-auto-sms-disabled' })
})

test('key-armed real-time AI enters observation mode and blocks every command', () => {
  const observed = reduceWorkspaceState(
    reduceWorkspaceState(state(), { type: 'toggle-key' }),
    { type: 'run-command', command: 'realtime-ai' },
  )
  const blocked = reduceWorkspaceState(observed, { type: 'run-command', command: 'create' })

  assert.deepEqual(observed.mode, { kind: 'observation' })
  assert.deepEqual(blocked.effect, { type: 'blocked-observation-command', command: 'create' })
  assert.deepEqual(blocked.mode, { kind: 'observation' })
})

test('local cancel exits the current mode while preserving the page selection', () => {
  const selected = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const active = reduceWorkspaceState(
    reduceWorkspaceState(selected, { type: 'toggle-key' }),
    { type: 'run-command', command: 'edit' },
  )
  const cancelled = reduceWorkspaceState(active, { type: 'cancel-mode' })

  assert.deepEqual(cancelled.mode, { kind: 'normal' })
  assert.equal(cancelled.keyState, 'disarmed')
  assert.deepEqual(cancelled.selection[clients], ['client-1'])
})

test('local clear only clears the currently active page selection', () => {
  const selectedClient = reduceWorkspaceState(state(), { type: 'select', resource: clients, id: 'client-1' })
  const selectedOrder = reduceWorkspaceState(selectedClient, { type: 'select', resource: 'orders', id: 'order-1' })
  const cleared = reduceWorkspaceState(selectedOrder, { type: 'clear-selection', resource: clients })

  assert.deepEqual(cleared.selection[clients], [])
  assert.deepEqual(cleared.selection.orders, ['order-1'])
})
