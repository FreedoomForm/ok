import { z } from 'zod'

export const inventorySchema = z.record(
  z.string().trim().min(1).max(120),
  z.number().finite().min(0).max(1_000_000),
)
