import { z } from 'zod'
import { passwordSchema } from '@/lib/validations'

export const adminProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Имя обязательно').max(255, 'Имя слишком длинное'),
  email: z.string().trim().email('Неверный формат email').max(255, 'Email слишком длинный'),
  password: z.union([passwordSchema, z.literal('')]).optional(),
})
