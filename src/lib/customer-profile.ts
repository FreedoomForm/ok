import { z } from 'zod'
import { extractCoordsFromText, type LatLng } from '@/lib/geo'

const deliveryDayKeys = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

const deliveryDaysSchema = z
  .record(z.string(), z.boolean())
  .superRefine((value, context) => {
    if (Object.keys(value).length > 7) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Too many delivery days' })
    }

    for (const key of Object.keys(value)) {
      if (!deliveryDayKeys.has(key)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `Unsupported delivery day: ${key}` })
      }
    }
  })

const optionalCaloriesSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).max(10000).optional()
)

export const customerProfilePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    address: z.string().trim().max(500).optional(),
    preferences: z.string().max(1000).optional(),
    calories: optionalCaloriesSchema,
    deliveryDays: z.union([deliveryDaysSchema, z.string().max(100)]).optional(),
    googleMapsLink: z.string().trim().max(2048).optional(),
  })
  .strict()

export type CustomerProfilePatch = z.infer<typeof customerProfilePatchSchema>

export type CustomerProfileUpdateData = {
  name?: string
  address?: string
  preferences?: string
  calories?: number
  deliveryDays?: string
  latitude?: number
  longitude?: number
}

export class InvalidCustomerProfileLocationError extends Error {
  constructor() {
    super('Invalid Google Maps link or coordinates')
    this.name = 'InvalidCustomerProfileLocationError'
  }
}

export type CustomerProfileUpdate = {
  data: CustomerProfileUpdateData
  coordinates: LatLng | null
}

export function buildCustomerProfileUpdateData(input: CustomerProfilePatch): CustomerProfileUpdate {
  const location = input.googleMapsLink ? extractCoordsFromText(input.googleMapsLink) : null
  if (input.googleMapsLink && !location) {
    throw new InvalidCustomerProfileLocationError()
  }

  const data: CustomerProfileUpdateData = {}
  if (input.name !== undefined) data.name = input.name
  if (input.address) data.address = input.address
  else if (input.googleMapsLink) data.address = input.googleMapsLink
  if (input.preferences !== undefined) data.preferences = input.preferences
  if (input.calories !== undefined) data.calories = input.calories
  if (input.deliveryDays !== undefined) {
    data.deliveryDays = typeof input.deliveryDays === 'string' ? input.deliveryDays : JSON.stringify(input.deliveryDays)
  }
  if (location) {
    data.latitude = location.lat
    data.longitude = location.lng
  }

  return { data, coordinates: location }
}

export function getCustomerProfilePatchError(input: unknown): string | null {
  const result = customerProfilePatchSchema.safeParse(input)
  if (result.success) return null
  return result.error.issues[0]?.message || 'Invalid profile data'
}

export function toCustomerProfileResponse<
  T extends {
    password?: unknown
    deletedAt?: unknown
    deletedBy?: unknown
    createdBy?: unknown
  },
>(customer: T) {
  const { password: _password, deletedAt: _deletedAt, deletedBy: _deletedBy, createdBy: _createdBy, ...profile } = customer
  return profile
}
