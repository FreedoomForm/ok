import { z } from "zod";

export const adminStatsSchema = z
  .object({
    successfulOrders: z.number().optional(),
    failedOrders: z.number().optional(),
    pendingOrders: z.number().optional(),
    inDeliveryOrders: z.number().optional(),
    pausedOrders: z.number().optional(),
    prepaidOrders: z.number().optional(),
    unpaidOrders: z.number().optional(),
    cardOrders: z.number().optional(),
    cashOrders: z.number().optional(),
    dailyCustomers: z.number().optional(),
    evenDayCustomers: z.number().optional(),
    oddDayCustomers: z.number().optional(),
    specialPreferenceCustomers: z.number().optional(),
    orders1200: z.number().optional(),
    orders1600: z.number().optional(),
    orders2000: z.number().optional(),
    orders2500: z.number().optional(),
    orders3000: z.number().optional(),
    singleItemOrders: z.number().optional(),
    multiItemOrders: z.number().optional(),
  })
  .strict();

export type AdminStats = z.infer<typeof adminStatsSchema>;

