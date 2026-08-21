export type QueueTaskResult = {
    task: string
    status: 'completed'
}

export type TaskExecutor<TContext, TResult> = (
    task: string,
    context: TContext,
    taskId: string,
) => TResult | Promise<TResult>

type QueuedTask<TContext, TResult> = {
    id: string
    task: string
    context: TContext
    resolve: (result: TResult) => void
    reject: (error: Error) => void
}

type TaskQueueCallbacks<TResult> = {
    onTaskStart?: (taskId: string, task: string) => void
    onTaskComplete?: (taskId: string, result: TResult) => void
    onTaskError?: (taskId: string, error: Error) => void
}

function toError(value: unknown): Error {
    return value instanceof Error ? value : new Error(String(value))
}

function defaultTaskExecutor(task: string): QueueTaskResult {
    return { task, status: 'completed' }
}

export class TaskQueue<TContext = unknown, TResult = QueueTaskResult> {
    private queue: Array<QueuedTask<TContext, TResult>> = []
    private isProcessing = false
    private readonly delayMs: number
    private readonly executor: TaskExecutor<TContext, TResult>
    private callbacks: TaskQueueCallbacks<TResult> = {}

    constructor(
        delayMs = 4000,
        executor?: TaskExecutor<TContext, TResult>,
    ) {
        this.delayMs = Math.max(0, delayMs)
        this.executor = executor ?? ((task) => defaultTaskExecutor(task) as TResult)
    }

    setCallbacks(callbacks: TaskQueueCallbacks<TResult>): void {
        this.callbacks = callbacks
    }

    async enqueue(task: string, context: TContext): Promise<TResult> {
        return new Promise((resolve, reject) => {
            const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
            this.queue.push({ id, task, context, resolve, reject })
            void this.processQueue()
        })
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) return

        this.isProcessing = true

        while (this.queue.length > 0) {
            const item = this.queue.shift()
            if (!item) continue

            try {
                this.callbacks.onTaskStart?.(item.id, item.task)
                const result = await this.executor(item.task, item.context, item.id)
                this.callbacks.onTaskComplete?.(item.id, result)
                item.resolve(result)
            } catch (error) {
                const normalizedError = toError(error)
                this.callbacks.onTaskError?.(item.id, normalizedError)
                item.reject(normalizedError)
            }

            if (this.queue.length > 0) {
                await this.delay(this.delayMs)
            }
        }

        this.isProcessing = false
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    get pendingCount(): number {
        return this.queue.length
    }

    get isActive(): boolean {
        return this.isProcessing
    }

    clear(): void {
        const queuedTasks = this.queue.splice(0)
        const error = new Error('Queue cleared')
        queuedTasks.forEach((item) => item.reject(error))
    }
}

export const taskQueue = new TaskQueue<unknown, QueueTaskResult>(4000)
