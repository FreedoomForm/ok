import { z } from 'zod'

const historyEntrySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
})

export const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  websiteId: z.string().trim().min(1).max(191).optional(),
  history: z.array(historyEntrySchema).max(20).optional(),
})

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>
