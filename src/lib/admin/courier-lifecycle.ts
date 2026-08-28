import { z } from 'zod'

export const courierLifecycleSchema = z.object({
  courierId: z.string().trim().min(1).max(128),
  isActive: z.boolean(),
}).strict()

export function buildCourierLifecycleData(input: Pick<z.infer<typeof courierLifecycleSchema>, 'isActive'>) {
  return { isActive: input.isActive }
}

type CourierWorkloadRow = {
  id: string
  orderNumber: number
  deliveryDate: Date | null
  orderStatus: string
}

const terminalStatuses = new Set(['DELIVERED', 'CANCELED'])

export function getAffectedFutureCourierOrders(rows: readonly CourierWorkloadRow[], today: Date): CourierWorkloadRow[] {
  const startOfToday = new Date(today)
  startOfToday.setUTCHours(0, 0, 0, 0)
  return rows.filter((row) => row.deliveryDate !== null && row.deliveryDate >= startOfToday && !terminalStatuses.has(row.orderStatus))
}
