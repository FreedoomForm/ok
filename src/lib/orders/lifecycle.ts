import { z } from 'zod'

const optionalFiniteNumber = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional())

const optionalNullableFiniteNumber = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => (value === '' || value === 'null' ? null : value), schema.nullable().optional())

const boundedId = z.string().trim().max(128)

export const orderLifecycleActionSchema = z.enum([
  'start_delivery',
  'pause_delivery',
  'resume_delivery',
  'complete_delivery',
  'update_details',
])

export const orderLifecycleRequestSchema = z
  .object({
    action: orderLifecycleActionSchema,
    customerName: z.string().max(255).optional(),
    customerPhone: z.string().max(32).optional(),
    deliveryAddress: z.string().max(500).optional(),
    deliveryTime: z.string().max(100).optional(),
    quantity: optionalFiniteNumber(z.coerce.number().int().min(1).max(100)),
    calories: optionalFiniteNumber(z.coerce.number().int().min(0).max(10000)),
    specialFeatures: z.string().max(500).optional(),
    paymentStatus: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).optional(),
    isPrepaid: z.boolean().optional(),
    amountReceived: optionalNullableFiniteNumber(z.coerce.number().min(0).max(1_000_000_000)),
    date: z
      .string()
      .max(40)
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Неверный формат даты')
      .optional(),
    courierId: z.union([boundedId, z.literal(''), z.literal('null')]).optional(),
    assignedSetId: z.union([boundedId, z.literal(''), z.literal('null')]).optional(),
    selectedClientId: z.union([boundedId, z.literal('')]).optional(),
    latitude: optionalNullableFiniteNumber(z.coerce.number().min(-90).max(90)),
    longitude: optionalNullableFiniteNumber(z.coerce.number().min(-180).max(180)),
  })
  .strict()

export type OrderLifecycleRequest = z.infer<typeof orderLifecycleRequestSchema>

export function getOrderLifecycleRequestError(input: unknown): string | null {
  const parsed = orderLifecycleRequestSchema.safeParse(input)
  if (parsed.success) return null

  const firstIssue = parsed.error.issues[0]
  if (firstIssue?.path[0] === 'action') return 'Неизвестное действие'
  return firstIssue?.message || 'Invalid order lifecycle payload'
}
