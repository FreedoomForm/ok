import assert from 'node:assert/strict'
import test from 'node:test'

import { TaskQueue } from '@/lib/ai/queue'

test('task queue executes FIFO with typed context and lifecycle callbacks', async () => {
  const events: string[] = []
  const queue = new TaskQueue<{ adminId: string }, { task: string; adminId: string }>(0, async (task, context, taskId) => {
    events.push(`start:${taskId}:${task}`)
    return { task, adminId: context.adminId }
  })
  queue.setCallbacks({
    onTaskComplete: (_taskId, result) => events.push(`complete:${result.task}`),
  })

  const first = queue.enqueue('first', { adminId: 'admin-1' })
  const second = queue.enqueue('second', { adminId: 'admin-1' })
  assert.equal(queue.pendingCount, 1)

  assert.deepEqual(await Promise.all([first, second]), [
    { task: 'first', adminId: 'admin-1' },
    { task: 'second', adminId: 'admin-1' },
  ])
  assert.equal(queue.pendingCount, 0)
  assert.equal(queue.isActive, false)
  assert.deepEqual(events.map((event) => event.replace(/task_[^:]+/g, 'task')), [
    'start:task:first',
    'complete:first',
    'start:task:second',
    'complete:second',
  ])
})

test('task queue normalizes unknown executor failures and continues processing', async () => {
  const failures: string[] = []
  let attempts = 0
  const queue = new TaskQueue<null, string>(0, async (task) => {
    attempts += 1
    if (task === 'bad') throw 'provider unavailable'
    return 'ok'
  })
  queue.setCallbacks({ onTaskError: (_taskId, error) => failures.push(error.message) })

  await assert.rejects(queue.enqueue('bad', null), { message: 'provider unavailable' })
  assert.equal(await queue.enqueue('good', null), 'ok')
  assert.deepEqual(failures, ['provider unavailable'])
  assert.equal(attempts, 2)
})

test('clear rejects queued work without interrupting the active task', async () => {
  let releaseActive!: () => void
  const activeReleased = new Promise<void>((resolve) => { releaseActive = resolve })
  const queue = new TaskQueue<null, string>(0, async (task) => {
    if (task === 'active') await activeReleased
    return task
  })

  const active = queue.enqueue('active', null)
  const queued = queue.enqueue('queued', null)
  await new Promise((resolve) => setTimeout(resolve, 0))
  queue.clear()
  await assert.rejects(queued, { message: 'Queue cleared' })
  releaseActive()
  assert.equal(await active, 'active')
})
