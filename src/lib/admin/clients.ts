import { Prisma } from '@prisma/client'
import { z } from 'zod'

export const clientIdSchema = z.string().trim().min(1).max(128)

const optionalNullableId = z.string().trim().max(128).transform((value) => value || null).nullable().optional()

const deliveryDaysSchema = z.record(
  z.string().regex(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/),
  z.boolean()
)

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nickName: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().min(10).max(15),
  address: z.string().trim().min(1).max(500),
  calories: z.coerce.number().int().min(500).max(10_000).optional().default(2_000),
  planType: z.enum(['CLASSIC', 'INDIVIDUAL', 'DIABETIC']).optional().default('CLASSIC'),
  dailyPrice: z.coerce.number().int().min(0).max(100_000_000).optional().default(84_000),
  notes: z.string().trim().max(2_000).optional().default(''),
  specialFeatures: z.string().trim().max(2_000).optional().default(''),
  deliveryDays: deliveryDaysSchema.optional().default({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  }),
  autoOrdersEnabled: z.boolean().optional().default(true),
  isActive: z.boolean().optional(),
  defaultCourierId: optionalNullableId,
  assignedSetId: optionalNullableId,
  googleMapsLink: z.string().trim().max(2_000).optional(),
  latitude: z.coerce.number().finite().min(-90).max(90).nullable().optional().default(null),
  longitude: z.coerce.number().finite().min(-180).max(180).nullable().optional().default(null),
}).strict()

export type ClientCreateData = z.infer<typeof clientCreateSchema>

export function buildClientCreateData(
  data: ClientCreateData,
  createdBy?: string | null,
  hashedPassword?: string,
): Prisma.CustomerUncheckedCreateInput {
  const deliveryDays = JSON.stringify(data.deliveryDays)
  return {
    name: data.name,
    nickName: data.nickName,
    phone: data.phone,
    address: data.address,
    preferences: data.specialFeatures,
    orderPattern: deliveryDays,
    calories: data.calories,
    planType: data.planType,
    dailyPrice: data.dailyPrice,
    notes: data.notes,
    deliveryDays,
    autoOrdersEnabled: data.autoOrdersEnabled,
    isActive: true,
    latitude: data.latitude,
    longitude: data.longitude,
    defaultCourierId: data.defaultCourierId ?? null,
    assignedSetId: data.assignedSetId ?? null,
    createdBy: createdBy ?? null,
    ...(hashedPassword ? { password: hashedPassword } : {}),
  }
}

export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nickName: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  calories: z.coerce.number().int().min(500).max(10_000).optional(),
  planType: z.enum(['CLASSIC', 'INDIVIDUAL', 'DIABETIC']).optional(),
  notes: z.string().trim().max(2_000).optional(),
  specialFeatures: z.string().trim().max(2_000).optional(),
  deliveryDays: deliveryDaysSchema.optional(),
  autoOrdersEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
  defaultCourierId: optionalNullableId,
  assignedSetId: optionalNullableId,
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  password: z.string().trim().max(128).refine((value) => value.length === 0 || value.length >= 8, 'Password must be at least 8 characters').optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export type ClientUpdateData = z.infer<typeof clientUpdateSchema>

const clientBulkFieldsSchema = z.object({
  isActive: z.boolean().optional(),
  calories: z.coerce.number().int().min(500).max(10_000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const clientBulkUpdateSchema = z.object({
  clientIds: z.array(clientIdSchema).min(1).max(500),
  updates: clientBulkFieldsSchema,
}).strict()

export type ClientBulkUpdateData = z.infer<typeof clientBulkUpdateSchema>

export function buildClientBulkUpdateData(
  updates: ClientBulkUpdateData['updates']
): Prisma.CustomerUpdateManyMutationInput {
  const updateData: Prisma.CustomerUpdateManyMutationInput = {}

  if (updates.isActive !== undefined) updateData.isActive = updates.isActive
  if (updates.calories !== undefined) updateData.calories = updates.calories

  return updateData
}

export function buildClientUpdateData(
  data: ClientUpdateData,
  hashedPassword?: string
): Prisma.CustomerUncheckedUpdateInput {
  const updateData: Prisma.CustomerUncheckedUpdateInput = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.nickName !== undefined) updateData.nickName = data.nickName
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address
  if (data.calories !== undefined) updateData.calories = data.calories
  if (data.planType !== undefined) updateData.planType = data.planType
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.specialFeatures !== undefined) updateData.preferences = data.specialFeatures
  if (data.autoOrdersEnabled !== undefined) updateData.autoOrdersEnabled = data.autoOrdersEnabled
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.defaultCourierId !== undefined) updateData.defaultCourierId = data.defaultCourierId
  if (data.assignedSetId !== undefined) updateData.assignedSetId = data.assignedSetId
  if (data.latitude !== undefined) updateData.latitude = data.latitude
  if (data.longitude !== undefined) updateData.longitude = data.longitude

  if (data.deliveryDays !== undefined) {
    const serializedDeliveryDays = JSON.stringify(data.deliveryDays)
    updateData.orderPattern = serializedDeliveryDays
    updateData.deliveryDays = serializedDeliveryDays
  }

  if (hashedPassword && data.password) updateData.password = hashedPassword

  return updateData
}

export const clientListSelect = {
  id: true,
  name: true,
  nickName: true,
  phone: true,
  address: true,
  preferences: true,
  isActive: true,
  createdAt: true,
  latitude: true,
  longitude: true,
  defaultCourierId: true,
  calories: true,
  planType: true,
  dailyPrice: true,
  notes: true,
  deliveryDays: true,
  autoOrdersEnabled: true,
  balance: true,
  assignedSetId: true,
  defaultCourier: { select: { id: true, name: true } },
  assignedSet: { select: { id: true, name: true } },
  contracts: {
    select: {
      status: true,
      periods: { select: { startDate: true, endDate: true, status: true, enabledWeekdays: true, disabledDates: true } },
    },
  },
} as const

export const safeClientSelect = {
  id: true,
  name: true,
  nickName: true,
  phone: true,
  address: true,
  preferences: true,
  orderPattern: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  latitude: true,
  longitude: true,
  deletedAt: true,
  deletedBy: true,
  createdBy: true,
  defaultCourierId: true,
  calories: true,
  planType: true,
  dailyPrice: true,
  notes: true,
  deliveryDays: true,
  autoOrdersEnabled: true,
  balance: true,
  assignedSetId: true,
} as const
