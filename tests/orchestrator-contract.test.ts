import assert from 'node:assert/strict'
import test from 'node:test'

import { parseOrchestratorResponse } from '@/lib/ai/orchestrator-contract'

test('orchestrator parser keeps valid subtasks and coerces numeric IDs', () => {
  assert.deepEqual(parseOrchestratorResponse({
    subtasks: [{ id: '1', description: 'Create a client', tool: 'createCustomer', parameters: { name: 'A' } }],
    summary: 'Client creation planned',
  }), {
    subtasks: [{ id: 1, description: 'Create a client', tool: 'createCustomer', parameters: { name: 'A' } }],
    summary: 'Client creation planned',
  })
})

test('orchestrator parser rejects malformed or unbounded model output', () => {
  assert.equal(parseOrchestratorResponse(null), null)
  assert.equal(parseOrchestratorResponse({ subtasks: [], summary: '' }), null)
  assert.equal(parseOrchestratorResponse({
    subtasks: [{ id: 0, description: 'invalid' }],
    summary: 'Invalid task',
  }), null)
  assert.equal(parseOrchestratorResponse({
    subtasks: [{ id: 1, description: 'x'.repeat(4001) }],
    summary: 'Invalid task',
  }), null)
})

test('orchestrator parser tolerates harmless extra model fields', () => {
  assert.deepEqual(parseOrchestratorResponse({
    subtasks: [{ id: 2, description: 'Update order', generatedBy: 'model' }],
    summary: 'Update planned',
    confidence: 0.9,
  }), {
    subtasks: [{ id: 2, description: 'Update order' }],
    summary: 'Update planned',
  })
})
