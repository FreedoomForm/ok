import { z } from 'zod'

const numericInput = z.union([z.string(), z.number()])
const nullableNumericInput = numericInput.nullable().optional()

export const orderCreateRequestSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryTime: z.string().optional(),
  quantity: numericInput.optional(),
  calories: numericInput.optional(),
  specialFeatures: z.string().optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).optional(),
  isPrepaid: z.boolean().optional(),
  amountReceived: nullableNumericInput,
  date: z.string().nullable().optional(),
  selectedClientId: z.string().optional(),
  courierId: z.string().optional(),
  latitude: nullableNumericInput,
  longitude: nullableNumericInput,
  priority: nullableNumericInput,
  sourceChannel: z.string().optional(),
  etaMinutes: nullableNumericInput,
  routeDistanceKm: nullableNumericInput,
  routeDurationMin: nullableNumericInput,
  sequenceInRoute: nullableNumericInput,
  assignedSetId: z.string().nullable().optional(),
}).strip()

export type OrderCreateRequest = z.infer<typeof orderCreateRequestSchema>

export function parseOrderCreateRequest(input: unknown) {
  return orderCreateRequestSchema.safeParse(input)
}
