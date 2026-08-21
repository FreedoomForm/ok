import { z } from 'zod'

const latLngSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
})

const routeStopSchema = latLngSchema.extend({
  orderId: z.string().trim().min(1).max(128),
})

export const dispatchRouteSchema = z.object({
  containerId: z.string().trim().min(1).max(128),
  startPoint: latLngSchema.nullable().optional(),
  stops: z.array(routeStopSchema).max(100),
})

export const dispatchOptimizationRequestSchema = z.object({
  routes: z.array(dispatchRouteSchema).min(1).max(20),
})

export type DispatchRouteInput = z.infer<typeof dispatchRouteSchema>
