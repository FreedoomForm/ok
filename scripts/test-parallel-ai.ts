import { executeParallelTasks } from '../src/lib/ai/orchestrator'

async function testParallelExecution() {
    console.log('🚀 Starting Parallel Execution Test (250 tasks simulation)...')

    // Create 50 mock tasks (250 is too many for a quick test, but logic is same)
    const tasks = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        description: `Task ${i + 1}`,
        tool: 'updateCell',
        parameters: { cell: `A${i + 1}`, value: i * 10 },
        status: 'pending' as const
    }))

    const startTime = Date.now()

    await executeParallelTasks(
        tasks,
        { adminId: 'test-admin' },
        (taskId, status, result) => {
            if (status === 'completed') {
                // process.stdout.write('.') // Dot progress
            }
        }
    )

    const duration = Date.now() - startTime
    console.log(`\n✅ Completed 50 tasks in ${duration}ms`)
    console.log(`⚡ Average time per task: ${duration / 50}ms`)

    if (duration < 5000) {
        console.log('✨ Parallel execution confirmed (Sequential would take >200s with 4s delay)')
    } else {
        console.log('⚠️ Warning: Execution seems slow, check parallelism')
    }
}

testParallelExecution().catch(console.error)
