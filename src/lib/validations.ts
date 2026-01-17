import { z } from 'zod'

// Phone validation - supports international formats
export const phoneSchema = z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 цифр')
    .max(15, 'Номер телефона не может содержать более 15 цифр')
    .regex(/^\+?[0-9]+$/, 'Номер телефона может содержать только цифры и + в начале')

// Password validation - min 8 chars
export const passwordSchema = z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(100, 'Пароль слишком длинный')

// Email validation
export const emailSchema = z.string()
    .email('Неверный формат email')
    .max(255, 'Email слишком длинный')

// Client creation schema
export const clientCreateSchema = z.object({
    name: z.string().min(1, 'Имя обязательно').max(255, 'Имя слишком длинное'),
    phone: phoneSchema,
    address: z.string().min(1, 'Адрес обязателен').max(500, 'Адрес слишком длинный'),
    preferences: z.string().max(1000, 'Предпочтения слишком длинные').optional(),
    calories: z.number().int().min(0).max(10000).optional(),
    deliveryDays: z.string().max(100).optional(),
    defaultCourierId: z.string().optional(),
    autoOrdersEnabled: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
})

// Client update schema (all fields optional except ID)
export const clientUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    phone: phoneSchema.optional(),
    address: z.string().min(1).max(500).optional(),
    preferences: z.string().max(1000).optional(),
    calories: z.number().int().min(0).max(10000).optional(),
    deliveryDays: z.string().max(100).optional(),
    defaultCourierId: z.string().nullable().optional(),
    autoOrdersEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional()
})

// Admin creation schema
export const adminCreateSchema = z.object({
    name: z.string().min(1, 'Имя обязательно').max(255, 'Имя слишком длинное'),
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER']),
    allowedTabs: z.array(z.string()).optional()
})

// Admin update schema
export const adminUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: z.enum(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER']).optional(),
    isActive: z.boolean().optional(),
    allowedTabs: z.array(z.string()).optional()
})

// Order creation schema
export const orderCreateSchema = z.object({
    customerId: z.string(),
    deliveryAddress: z.string().min(1).max(500),
    deliveryDate: z.string().optional(), // ISO date string
    deliveryTime: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    calories: z.number().int().min(0).max(10000),
    specialFeatures: z.string().max(500).optional(),
    paymentStatus: z.enum(['PAID', 'UNPAID']),
    paymentMethod: z.enum(['CARD', 'CASH']),
    orderStatus: z.enum(['PENDING', 'IN_DELIVERY', 'PAUSED', 'DELIVERED', 'FAILED']).optional(),
    isPrepaid: z.boolean().optional(),
    courierId: z.string().optional()
})

// Chat message schema
export const chatMessageSchema = z.object({
    conversationId: z.string(),
    content: z.string().min(1, 'Сообщение не может быть пустым').max(5000, 'Сообщение слишком длинное')
})

// Bulk update schema
export const bulkUpdateSchema = z.object({
    ids: z.array(z.string()).min(1, 'Необходимо выбрать хотя бы один элемент'),
    data: z.record(z.string(), z.any())
})
