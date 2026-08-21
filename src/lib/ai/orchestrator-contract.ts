import { z } from 'zod'

export const orchestratorSubTaskSchema = z.object({
  id: z.coerce.number().int().min(1).max(1000),
  description: z.string().trim().min(1).max(4000),
  tool: z.string().trim().min(1).max(100).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
})

export const orchestratorResponseSchema = z.object({
  subtasks: z.array(orchestratorSubTaskSchema).max(250),
  summary: z.string().trim().min(1).max(4000),
})

export type OrchestratorSubTask = z.infer<typeof orchestratorSubTaskSchema>
export type ParsedOrchestratorResponse = z.infer<typeof orchestratorResponseSchema>

export function parseOrchestratorResponse(value: unknown): ParsedOrchestratorResponse | null {
  const parsed = orchestratorResponseSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
