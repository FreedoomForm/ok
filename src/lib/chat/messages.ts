import { z } from 'zod'

export const sendMessageSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  content: z.string().trim().min(1).max(5000),
  replyToMessageId: z.string().trim().min(1).max(128).optional(),
}).strict()
