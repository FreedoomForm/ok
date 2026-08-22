import type { Prisma } from '@prisma/client'

export const customerAccessSelect = {
  id: true,
  isActive: true,
  calories: true,
  createdBy: true,
} satisfies Prisma.CustomerSelect

export type CustomerAccess = Prisma.CustomerGetPayload<{ select: typeof customerAccessSelect }>

export const customerLoginSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  password: true,
  isActive: true,
} satisfies Prisma.CustomerSelect

export type CustomerLoginRecord = Prisma.CustomerGetPayload<{ select: typeof customerLoginSelect }>

export const customerSiteAuthSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  balance: true,
  isActive: true,
} satisfies Prisma.CustomerSelect

export type CustomerSiteAuthRecord = Prisma.CustomerGetPayload<{ select: typeof customerSiteAuthSelect }>

export const customerProfileSelect = {
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
  defaultCourierId: true,
  calories: true,
  planType: true,
  dailyPrice: true,
  notes: true,
  deliveryDays: true,
  autoOrdersEnabled: true,
  balance: true,
  assignedSetId: true,
} satisfies Prisma.CustomerSelect

export type CustomerProfileRecord = Prisma.CustomerGetPayload<{ select: typeof customerProfileSelect }>
