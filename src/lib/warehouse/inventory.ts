import { z } from 'zod'

export const inventorySchema = z.record(
  z.string().trim().min(1).max(120),
  z.number().finite().min(0).max(1_000_000),
).superRefine((inventory, context) => {
  if (Object.keys(inventory).length > 500) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Inventory contains too many items' })
  }
})
