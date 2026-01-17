import { GoogleGenerativeAI } from '@google/generative-ai'
import { taskQueue } from './queue'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface SubTask {
    id: number
    description: string
    tool?: string
    parameters?: Record<string, unknown>
    status: 'pending' | 'running' | 'completed' | 'failed'
    result?: unknown
    error?: string
}

interface OrchestratorResult {
    success: boolean
    tasks: SubTask[]
    summary: string
}

// Gemini Pro Orchestrator - breaks down complex tasks into subtasks
export async function orchestrateTask(
    userRequest: string,
    context: {
        adminId: string
        workspaceData?: unknown
        websiteData?: unknown
    }
): Promise<OrchestratorResult> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        systemInstruction: `You are an AI orchestrator for a no-code platform.
Your job is to break down user requests into specific, executable subtasks.

Available tools:
- createTab: Create new tab/sheet
- deleteTab: Delete a tab
- addColumn: Add column to sheet
- addRow: Add row with data
- updateCell: Update cell value
- queryDatabase: Query customers/orders/couriers
- createCustomer: Add new customer
- createOrder: Create new order
- updateWebsite: Modify website settings
- generateWebsiteSection: Generate website content

When breaking down tasks:
1. Identify all required operations
2. Order them logically (dependencies first)
3. Be specific with parameters
4. Keep each subtask atomic

Respond with JSON:
{
  "subtasks": [
    { "id": 1, "description": "...", "tool": "...", "parameters": {...} },
    ...
  ],
  "summary": "Brief description of what will be done"
}`
    })

    try {
        const result = await model.generateContent(userRequest)
        const response = result.response.text()

        // Parse the response
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('Failed to parse orchestrator response')
        }

        const parsed = JSON.parse(jsonMatch[0])

        const tasks: SubTask[] = parsed.subtasks.map((st: { id: number; description: string; tool?: string; parameters?: Record<string, unknown> }) => ({
            id: st.id,
            description: st.description,
            tool: st.tool,
            parameters: st.parameters,
            status: 'pending' as const
        }))

        return {
            success: true,
            tasks,
            summary: parsed.summary
        }
    } catch (error) {
        console.error('Orchestrator error:', error)
        return {
            success: false,
            tasks: [],
            summary: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    }
}

// Execute subtasks using simulated parallel workers (250 workers capacity)
export async function executeParallelTasks(
    tasks: SubTask[],
    context: { adminId: string },
    onProgress?: (taskId: number, status: SubTask['status'], result?: unknown) => void
): Promise<SubTask[]> {
    const results: SubTask[] = []
    const MAX_CONCURRENT_WORKERS = 250
    const WORKER_DELAY_MS = 100 // Simulation delay per worker

    // Helper to process a single task
    const processTask = async (task: SubTask) => {
        try {
            onProgress?.(task.id, 'running')

            // Simulate worker startup delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * WORKER_DELAY_MS))

            // Execute task through queue (which handles rate limiting)
            const result = await taskQueue.enqueue(task.description, {
                ...context,
                tool: task.tool,
                parameters: task.parameters
            })

            const completedTask = {
                ...task,
                status: 'completed' as const,
                result
            }
            onProgress?.(task.id, 'completed', result)
            return completedTask
        } catch (error) {
            const failedTask = {
                ...task,
                status: 'failed' as const,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
            onProgress?.(task.id, 'failed', { error: failedTask.error })
            return failedTask
        }
    }

    // Process tasks in batches if they exceed worker capacity (unlikely with 250)
    for (let i = 0; i < tasks.length; i += MAX_CONCURRENT_WORKERS) {
        const batch = tasks.slice(i, i + MAX_CONCURRENT_WORKERS)
        const batchResults = await Promise.all(batch.map(processTask))
        results.push(...batchResults)
    }

    return results
}

// Individual Gemini worker for executing specific tasks
export async function executeTaskWithGemini(
    taskDescription: string,
    tool: string,
    parameters: Record<string, unknown>,
    context: { adminId: string }
): Promise<{ text: string; functionCall?: unknown }> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash'
    })

    const prompt = `Execute this task: ${taskDescription}
Tool to use: ${tool}
Parameters: ${JSON.stringify(parameters)}
Context: adminId=${context.adminId}

Return the action to execute as JSON.`

    const result = await model.generateContent(prompt)
    const response = result.response

    return { text: response.text() }
}
