import { z } from 'zod'

const coordinate = z.number().finite()

const orderLocationSchema = z.object({
  id: z.string().trim().min(1).max(128),
  address: z.string().trim().min(1).max(500),
  latitude: coordinate.min(-90).max(90).nullable().optional(),
  longitude: coordinate.min(-180).max(180).nullable().optional(),
})

const startPointSchema = z.object({
  lat: coordinate.min(-90).max(90),
  lng: coordinate.min(-180).max(180),
})

export const routeOptimizationRequestSchema = z.object({
  orders: z.array(orderLocationSchema).min(1).max(500),
  startPoint: startPointSchema.optional(),
})

export type RouteOptimizationRequest = z.infer<typeof routeOptimizationRequestSchema>
