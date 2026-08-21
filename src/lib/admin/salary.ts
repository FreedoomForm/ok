import { z } from 'zod'

export const salaryPaymentSchema = z.object({
  adminId: z.string().trim().min(1).max(128).optional(),
  recipientAdminId: z.string().trim().min(1).max(128).optional(),
  amount: z.number().finite().positive().max(1_000_000_000_000),
}).refine((payload) => Boolean(payload.recipientAdminId ?? payload.adminId), {
  message: 'A salary recipient is required',
  path: ['recipientAdminId'],
})
