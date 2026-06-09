// Rate-limited task queue for AI workers
// Implements 4-second delay between tasks

interface QueuedTask {
    id: string
    task: string
    context: any
    resolve: (result: any) => void
    reject: (error: Error) => void
}

class TaskQueue {
    private queue: QueuedTask[] = []
    private isProcessing = false
    private delayMs: number
    private onTaskStart?: (taskId: string, task: string) => void
    private onTaskComplete?: (taskId: string, result: any) => void
    private onTaskError?: (taskId: string, error: Error) => void

    constructor(delayMs = 4000) {
        this.delayMs = delayMs
    }

    setCallbacks(callbacks: {
        onTaskStart?: (taskId: string, task: string) => void
        onTaskComplete?: (taskId: string, result: any) => void
        onTaskError?: (taskId: string, error: Error) => void
    }) {
        this.onTaskStart = callbacks.onTaskStart
        this.onTaskComplete = callbacks.onTaskComplete
        this.onTaskError = callbacks.onTaskError
    }

    async enqueue(task: string, context: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
            this.queue.push({ id, task, context, resolve, reject })
            this.processQueue()
        })
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return

        this.isProcessing = true

        while (this.queue.length > 0) {
            const item = this.queue.shift()!

            try {
                this.onTaskStart?.(item.id, item.task)

                // Execute the task (this would call the actual AI worker)
                const result = await this.executeTask(item)

                this.onTaskComplete?.(item.id, result)
                item.resolve(result)
            } catch (error) {
                this.onTaskError?.(item.id, error as Error)
                item.reject(error as Error)
            }

            // Wait before processing next task (4 second delay)
            if (this.queue.length > 0) {
                await this.delay(this.delayMs)
            }
        }

        this.isProcessing = false
    }

    private async executeTask(item: QueuedTask): Promise<any> {
        // This is a placeholder - actual implementation would call Gemini
        // The orchestrator will override this method
        return { task: item.task, status: 'completed' }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    get pendingCount(): number {
        return this.queue.length
    }

    get isActive(): boolean {
        return this.isProcessing
    }

    clear() {
        this.queue.forEach(item => {
            item.reject(new Error('Queue cleared'))
        })
        this.queue = []
    }
}

// Singleton instance
export const taskQueue = new TaskQueue(4000)

// Export class for custom instances
export { TaskQueue }
