/**
 * API Contracts — Single source of truth for all API response shapes.
 *
 * These Zod schemas define the CONTRACT that every API route must satisfy.
 * They are used by:
 * - Contract tests (src/modules/[module]/contracts/*.contract.test.ts)
 * - E2E tests (tests/api-contract.spec.ts)
 * - Frontend type generation (potential future use)
 *
 * Every route built with `createApiRoute` returns:
 * - Success: `{ data: T, meta: { requestId: string } }`
 * - Error:   `{ error: { code: string, message: string, details? }, meta: { requestId: string } }`
 */

import { z } from 'zod'

// ════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const metaSchema = z.object({
  requestId: z.string(),
})

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: metaSchema.optional(),
  })

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: metaSchema.optional(),
})

export const paginatedMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  requestId: z.string().optional(),
})

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: paginatedMetaSchema,
  })
}

export function batchGetResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.object({
      items: z.array(itemSchema),
      notFound: z.array(z.string()),
    }),
    meta: metaSchema.optional(),
  })
}

// ════════════════════════════════════════════════════════════════════════════
// ERROR CODE CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export const httpStatusToErrorCode: Record<number, ErrorCode> = {
  400: ErrorCodes.BAD_REQUEST,
  401: ErrorCodes.UNAUTHORIZED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.NOT_FOUND,
  409: ErrorCodes.CONFLICT,
  422: ErrorCodes.VALIDATION_FAILED,
  429: ErrorCodes.RATE_LIMITED,
  500: ErrorCodes.INTERNAL_ERROR,
}

// ════════════════════════════════════════════════════════════════════════════
// ENUMS
// ════════════════════════════════════════════════════════════════════════════

export const orderStatusEnum = z.enum([
  'NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY',
  'PAUSED', 'DELIVERED', 'CANCELED', 'FAILED',
])

export const paymentStatusEnum = z.enum(['PAID', 'UNPAID', 'PARTIAL'])
export const paymentMethodEnum = z.enum(['CASH', 'CARD', 'TRANSFER'])
export const orderTypeEnum = z.enum(['MORNING', 'EVENING'])
export const planTypeEnum = z.enum(['CLASSIC', 'INDIVIDUAL', 'DIABETIC'])
export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE'])
export const adminRoleEnum = z.enum(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'WORKER'])

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════

export const orderCustomerSnapshotSchema = z.object({
  name: z.string(),
  phone: z.string(),
  assignedSetId: z.string().nullable(),
  assignedSetName: z.string().nullable(),
})

export const orderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  orderStatus: orderStatusEnum,
  customerId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  assignedSetId: z.string().nullable(),
  assignedSetName: z.string().nullable(),
  customer: orderCustomerSnapshotSchema,
  deliveryDate: z.string(),
  deliveryAddress: z.string().nullable(),
  deliveryTime: z.string().nullable(),
  quantity: z.number(),
  calories: z.number(),
  specialFeatures: z.string().nullable(),
  paymentStatus: paymentStatusEnum,
  paymentMethod: paymentMethodEnum,
  isPrepaid: z.boolean(),
  amountReceived: z.number().nullable(),
  courierId: z.string().nullable(),
  courierName: z.string().nullable(),
  isAutoOrder: z.boolean(),
  orderType: orderTypeEnum.nullable(),
  priority: z.number(),
  sourceChannel: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
})

export const orderDetailSchema = orderListItemSchema.extend({
  adminId: z.string().nullable(),
  etaMinutes: z.number().nullable(),
  routeDistanceKm: z.number().nullable(),
  routeDurationMin: z.number().nullable(),
  sequenceInRoute: z.number().nullable(),
  customerRating: z.number().nullable(),
  customerFeedback: z.string().nullable(),
  lastLatitude: z.number().nullable(),
  lastLongitude: z.number().nullable(),
  lastLocationAt: z.string().nullable(),
  statusChangedAt: z.string().nullable(),
  assignedAt: z.string().nullable(),
  pickedUpAt: z.string().nullable(),
  pausedAt: z.string().nullable(),
  resumedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  updatedAt: z.string(),
})

export const orderListResponseSchema = successResponseSchema(z.object({
  orders: z.array(orderListItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
}))

export const orderDetailResponseSchema = successResponseSchema(orderDetailSchema)

export const orderBatchGetResponseSchema = batchGetResponseSchema(orderListItemSchema)

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════════════════════════════════════

export const deliveryDaysSchema = z.object({
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
  saturday: z.boolean(),
  sunday: z.boolean(),
})

export const customerListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickName: z.string().nullable(),
  phone: z.string(),
  address: z.string(),
  calories: z.number(),
  planType: planTypeEnum,
  dailyPrice: z.number(),
  balance: z.number(),
  notes: z.string(),
  specialFeatures: z.string(),
  deliveryDays: deliveryDaysSchema,
  autoOrdersEnabled: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  defaultCourierId: z.string().nullable(),
  defaultCourierName: z.string().nullable(),
  assignedSetId: z.string().nullable(),
  assignedSetName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})

export const customerDetailSchema = customerListItemSchema.extend({
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  deletedBy: z.string().nullable(),
  createdBy: z.string().nullable(),
})

export const customerListResponseSchema = successResponseSchema(z.object({
  customers: z.array(customerListItemSchema),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
}))

export const customerBatchGetResponseSchema = batchGetResponseSchema(customerListItemSchema)

// ════════════════════════════════════════════════════════════════════════════
// FINANCE
// ════════════════════════════════════════════════════════════════════════════

export const transactionListItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: transactionTypeEnum,
  description: z.string().nullable(),
  category: z.string().nullable(),
  createdAt: z.string(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  adminName: z.string().nullable(),
  salaryRecipientAdminId: z.string().nullable(),
})

export const companyBalanceSchema = z.object({
  companyBalance: z.number(),
  history: z.array(transactionListItemSchema),
})

export const adminBalanceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  salaryPerDay: z.number(),
  days: z.number(),
  accrued: z.number(),
  paid: z.number(),
  balance: z.number(),
  withdrawnInRange: z.number(),
})

export const adminBalanceResultSchema = z.object({
  asOf: z.string(),
  admins: z.array(adminBalanceRowSchema),
})

export const buyIngredientsResultSchema = z.object({
  transactionId: z.string(),
  totalCost: z.number(),
})

export const transactionListResponseSchema = successResponseSchema(z.array(transactionListItemSchema))
export const companyBalanceResponseSchema = successResponseSchema(companyBalanceSchema)
export const adminBalancesResponseSchema = successResponseSchema(adminBalanceResultSchema)
export const buyIngredientsResponseSchema = successResponseSchema(buyIngredientsResultSchema)

// ════════════════════════════════════════════════════════════════════════════
// WAREHOUSE
// ════════════════════════════════════════════════════════════════════════════

export const warehouseItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  kcalPerGram: z.number().nullable(),
  pricePerUnit: z.number().nullable(),
  priceUnit: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ingredientRefSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
})

export const dishSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  mealType: z.string(),
  ingredients: z.array(ingredientRefSchema),
  calorieMappings: z.record(z.string(), z.array(z.string())).nullable(),
  menuNumbers: z.array(z.number()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const cookResultSchema = z.object({
  success: z.boolean(),
  cookedStats: z.record(z.string(), z.record(z.string(), z.number())),
})

export const ingredientsListResponseSchema = successResponseSchema(z.array(warehouseItemSchema))
export const dishesListResponseSchema = successResponseSchema(z.array(dishSchema))
export const cookResponseSchema = successResponseSchema(cookResultSchema)

// ════════════════════════════════════════════════════════════════════════════
// CHAT
// ════════════════════════════════════════════════════════════════════════════

export const chatUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
})

export const lastMessageSchema = z.object({
  content: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
  senderId: z.string(),
})

export const conversationSchema = z.object({
  id: z.string(),
  otherParticipant: chatUserSchema,
  lastMessage: lastMessageSchema.nullable(),
  lastMessageAt: z.string(),
  unreadCount: z.number(),
})

export const messageSenderSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
})

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  sender: messageSenderSchema,
})

export const conversationsResponseSchema = successResponseSchema(z.array(conversationSchema))
export const messagesResponseSchema = successResponseSchema(z.array(messageSchema))
export const chatUsersResponseSchema = successResponseSchema(z.array(chatUserSchema))

// ════════════════════════════════════════════════════════════════════════════
// COURIER
// ════════════════════════════════════════════════════════════════════════════

export const courierProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  phone: z.string().nullable(),
  salary: z.number(),
  salaryPerDay: z.number(),
  salaryAccrued: z.number(),
  salaryPaid: z.number(),
  balance: z.number(),
  createdAt: z.string(),
})

export const courierOrderCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
})

export const courierOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  orderStatus: z.string(),
  customerId: z.string(),
  deliveryAddress: z.string(),
  deliveryTime: z.string().nullable(),
  deliveryDate: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  quantity: z.number(),
  calories: z.number(),
  specialFeatures: z.string().nullable(),
  notes: z.string().nullable(),
  paymentStatus: z.string(),
  paymentMethod: z.string(),
  isPrepaid: z.boolean(),
  courierId: z.string().nullable(),
  customer: courierOrderCustomerSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const courierStatsSchema = z.object({
  totalDelivered: z.number(),
  todayDelivered: z.number(),
})

export const courierProfileResponseSchema = successResponseSchema(courierProfileSchema)
export const courierOrdersResponseSchema = successResponseSchema(z.array(courierOrderSchema))
export const courierStatsResponseSchema = successResponseSchema(courierStatsSchema)
export const courierRouteResponseSchema = successResponseSchema(z.array(courierOrderSchema))

// ════════════════════════════════════════════════════════════════════════════
// ADMINS
// ════════════════════════════════════════════════════════════════════════════

export const adminDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: adminRoleEnum,
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  allowedTabs: z.array(z.string()).nullable(),
})

export const adminListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: adminRoleEnum,
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  allowedTabs: z.array(z.string()).nullable(),
  createdAt: z.string(),
  salary: z.number(),
  creatorName: z.string().nullable(),
})

export const adminDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: adminRoleEnum,
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  allowedTabs: z.array(z.string()).nullable(),
  createdAt: z.string(),
  salary: z.number(),
  hasPassword: z.boolean(),
})

export const adminListResponseSchema = successResponseSchema(z.array(adminListItemSchema))
export const adminDetailResponseSchema = successResponseSchema(adminDetailSchema)
export const adminCreateResponseSchema = successResponseSchema(adminDTOSchema)
export const adminBatchGetResponseSchema = batchGetResponseSchema(adminListItemSchema)

// ════════════════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════════════════

export const healthResponseSchema = successResponseSchema(z.object({
  message: z.string(),
}))
