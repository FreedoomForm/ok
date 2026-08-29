import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildResourceMutationRequests,
  RESOURCE_ADAPTERS,
  type ResourceRequestDescriptor,
} from '@/components/admin/dashboard/shared/resource-adapters'
import { WORKSPACE_RESOURCE_PAGES, type WorkspaceResourcePage } from '@/components/admin/dashboard/shared/workspace-state'

const perIdAdapters: ReadonlyArray<[WorkspaceResourcePage, readonly ['edit' | 'trash' | 'restore' | 'enable' | 'disable', ...Array<'edit' | 'trash' | 'restore' | 'enable' | 'disable'>]]> = [
  ['ingredients', ['edit', 'trash', 'restore', 'enable', 'disable']],
  ['dishes', ['edit', 'trash', 'restore', 'enable', 'disable']],
  ['cooking', ['trash', 'restore', 'enable', 'disable']],
  ['finance', ['trash', 'restore', 'enable', 'disable']],
  ['transactions', ['trash', 'restore', 'enable', 'disable']],
  ['admins', ['trash', 'restore', 'enable', 'disable']],
  ['couriers', ['trash', 'restore', 'enable', 'disable']],
  ['contracts', ['trash', 'restore', 'enable', 'disable']],
  ['routes', ['trash', 'restore', 'enable', 'disable']],
  ['chat', ['edit', 'trash', 'restore']],
  ['calculator', ['restore', 'edit']],
]

test('single-id adapters fan out one request per selected id', () => {
  for (const [page, mutations] of perIdAdapters) {
    for (const mutation of mutations) {
      const requests = buildResourceMutationRequests(page, mutation, ['id-a', 'id-b', 'id-c'])
      assert.equal(requests.length, 3, `${page}.${mutation} must affect every selected row`)
      for (const [index, id] of ['id-a', 'id-b', 'id-c'].entries()) {
        const expected = buildResourceMutationRequests(page, mutation, [id])[0]
        assert.ok(expected, `${page}.${mutation} must build a request for ${id}`)
        assert.deepEqual(requests[index], expected, `${page}.${mutation} request ${index} must target ${id}`)
        assert.ok(JSON.stringify(requests[index]).includes(id), `${page}.${mutation} request ${index} must embed ${id}`)
      }
    }
  }
})

test('group composite ids fan out to their own set/group endpoints', () => {
  const requests = buildResourceMutationRequests('groups', 'trash', ['set-1:group-1', 'set-2:group-2'])
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[0], { path: '/api/admin/sets/set-1/groups/group-1', method: 'PATCH', body: { deletedAt: true } })
  assert.deepEqual(requests[1], { path: '/api/admin/sets/set-2/groups/group-2', method: 'PATCH', body: { deletedAt: true } })
})

test('bulk adapters keep one aggregated request carrying every selected id', () => {
  assert.deepEqual(buildResourceMutationRequests('orders', 'trash', ['order-1', 'order-2']), [
    { path: '/api/admin/orders/delete', method: 'DELETE', body: { orderIds: ['order-1', 'order-2'] } },
  ])
  assert.deepEqual(buildResourceMutationRequests('orders', 'restore', ['order-2', 'order-3']), [
    { path: '/api/admin/orders/restore', method: 'POST', body: { orderIds: ['order-2', 'order-3'] } },
  ])
  assert.deepEqual(buildResourceMutationRequests('clients', 'disable', ['client-1', 'client-2']), [
    { path: '/api/admin/clients/toggle-status', method: 'PATCH', body: { clientIds: ['client-1', 'client-2'], isActive: false } },
  ])
  assert.deepEqual(buildResourceMutationRequests('clients', 'enable', ['client-1', 'client-2']), [
    { path: '/api/admin/clients/toggle-status', method: 'PATCH', body: { clientIds: ['client-1', 'client-2'], isActive: true } },
  ])
  assert.deepEqual(buildResourceMutationRequests('clients', 'trash', ['client-1', 'client-2']), [
    { path: '/api/admin/clients/delete', method: 'DELETE', body: { clientIds: ['client-1', 'client-2'] } },
  ])
})

test('fan-out dedupes repeated ids and ignores empty input', () => {
  assert.deepEqual(buildResourceMutationRequests('ingredients', 'disable', []), [])
  assert.deepEqual(buildResourceMutationRequests('ingredients', 'disable', ['', '  ', '']), [])
  const deduped = buildResourceMutationRequests('ingredients', 'disable', ['id-a', 'id-a', ' ', 'id-b'])
  assert.equal(deduped.length, 2)
  assert.deepEqual(deduped[0], { path: '/api/admin/warehouse/ingredients', method: 'PATCH', body: { id: 'id-a', isActive: false } })
  assert.deepEqual(deduped[1], { path: '/api/admin/warehouse/ingredients', method: 'PATCH', body: { id: 'id-b', isActive: false } })
})

test('per-id fan-out encodes each id into the request path', () => {
  const trash = buildResourceMutationRequests('ingredients', 'trash', ['ing 1', 'ing/2'])
  assert.deepEqual(trash, [
    { path: '/api/admin/warehouse/ingredients?id=ing%201', method: 'DELETE' },
    { path: '/api/admin/warehouse/ingredients?id=ing%2F2', method: 'DELETE' },
  ])
  const routes = buildResourceMutationRequests('routes', 'trash', ['route/1', 'route/2'])
  assert.deepEqual(routes.map((request) => request.path), [
    '/api/admin/routes/route%2F1',
    '/api/admin/routes/route%2F2',
  ])
  assert.deepEqual(routes.map((request) => request.method), ['DELETE', 'DELETE'])
})

test('settings edit stays a single page-level request', () => {
  assert.deepEqual(buildResourceMutationRequests('settings', 'edit', ['settings']), [
    { path: '/api/admin/settings', method: 'PUT' },
  ])
})

test('string-path descriptors are either flagged per-id or are known bulk endpoints', () => {
  const knownBulk = new Set(['/api/admin/orders/delete', '/api/admin/orders/restore', '/api/admin/clients/delete', '/api/admin/clients/restore', '/api/admin/clients/toggle-status'])
  for (const page of WORKSPACE_RESOURCE_PAGES) {
    const adapter = RESOURCE_ADAPTERS[page]
    for (const [mutation, descriptor] of Object.entries(adapter.mutations) as Array<[string, ResourceRequestDescriptor]>) {
      if (typeof descriptor.path === 'function') continue
      if (descriptor.perId === true) continue
      if (!descriptor.body) continue
      assert.ok(
        knownBulk.has(descriptor.path),
        `${page}.${mutation} uses a fixed path with an ids body but is not a known bulk endpoint`,
      )
    }
  }
})
