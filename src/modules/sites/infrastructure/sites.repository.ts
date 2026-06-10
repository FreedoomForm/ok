/**
 * Sites Repository — Data access layer for the Sites / multi-tenant module.
 *
 * Encapsulates all Prisma queries for website and customer-facing operations,
 * providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 */

import { db } from '@/modules/shared/db'
import { Prisma, OrderStatus } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'
import {
  parseSiteContent,
  parseThemePayload,
  type SiteStyleVariant,
} from '@/lib/site-builder'
import type {
  WebsiteDTO,
  CustomerProfileDTO,
  AdminWebsiteSettingsDTO,
  TodayMenuDTO,
  TodayMenuDishDTO,
  CustomerPlanDTO,
  SiteAuthResult,
  SiteRegistrationResult,
  SiteUpdateResult,
  SiteSendCodeResult,
  CustomerLogoutResult,
  TogglePlanResult,
  CustomerProfileUpdateData,
  AiEditResult,
  AiEditData,
} from '../contracts'
import {
  SITE_STYLE_PRESETS,
  SITE_RENDER_PAGES,
  DEFAULT_STYLE_VARIANT,
  buildThemePayload,
  getStylePreset,
  isValidSubdomain,
  normalizeSubdomain,
  updateSiteName,
  RESERVED_SUBDOMAINS,
} from '@/lib/site-builder'
import { buildSubdomainUrl } from '@/lib/subdomain-host'
import { generateWebsiteContent, type GeneratedSiteContent } from '@/lib/ai-site-generator'
import { createCustomerToken } from '@/lib/customer-auth'
import { canSendOtp, issueOtp, verifyOtp } from '@/lib/otp-store'
import { sendOtpSms } from '@/lib/sms-provider'
import { extractCoordsFromText } from '@/lib/geo'

// ── Prisma select presets ────────────────────────────────────────────────────

/** Website select for public site view. */
const WEBSITE_PUBLIC_SELECT = {
  id: true,
  subdomain: true,
  adminId: true,
  chatEnabled: true,
  theme: true,
  content: true,
} as const

/** Website select for admin settings view. */
const WEBSITE_ADMIN_SELECT = {
  id: true,
  subdomain: true,
  theme: true,
  content: true,
  chatEnabled: true,
} as const

/** Customer select for auth operations. */
const CUSTOMER_AUTH_SELECT = {
  id: true,
  name: true,
  phone: true,
  address: true,
  balance: true,
  isActive: true,
} as const

/** Customer select for profile view. */
const CUSTOMER_PROFILE_SELECT = {
  id: true,
  name: true,
  phone: true,
  address: true,
  balance: true,
  calories: true,
  planType: true,
  dailyPrice: true,
  autoOrdersEnabled: true,
  deliveryDays: true,
  preferences: true,
  latitude: true,
  longitude: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
} as const

/** Customer select for site registration. */
const CUSTOMER_REGISTER_SELECT = {
  id: true,
  name: true,
  phone: true,
} as const

/** Customer select for plan toggle. */
const CUSTOMER_PLAN_SELECT = {
  id: true,
  autoOrdersEnabled: true,
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type CustomerAuthRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_AUTH_SELECT }>
type CustomerProfileRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_PROFILE_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

function toWebsiteDTO(
  row: Prisma.WebsiteGetPayload<{ select: typeof WEBSITE_PUBLIC_SELECT }>,
): WebsiteDTO {
  const theme = parseThemePayload(row.theme)
  const content = parseSiteContent(row.content, row.subdomain)
  const siteName = content.about.title.en.replace(/^About\s+/, '') || row.subdomain

  return {
    id: row.id,
    subdomain: row.subdomain,
    adminId: row.adminId,
    chatEnabled: row.chatEnabled,
    styleVariant: theme.styleVariant,
    palette: theme.palette,
    siteName,
    content,
  }
}

function toCustomerProfileDTO(row: CustomerProfileRow): CustomerProfileDTO {
  const deliveryDays = safeJsonParse<Record<string, boolean>>(row.deliveryDays, {}) as Record<string, boolean> | null
  const googleMapsLink =
    typeof row.latitude === 'number' && typeof row.longitude === 'number'
      ? `https://maps.google.com/?q=${row.latitude},${row.longitude}`
      : ''

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    balance: typeof row.balance === 'number' ? row.balance : 0,
    calories: row.calories || 2000,
    planType: row.planType || 'CLASSIC',
    dailyPrice: row.dailyPrice || 84000,
    autoOrdersEnabled: row.autoOrdersEnabled,
    deliveryDays,
    preferences: row.preferences,
    googleMapsLink,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }
}

function toSiteAuthResult(
  customer: CustomerAuthRow,
  token: string,
): SiteAuthResult {
  return {
    success: true,
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      balance: typeof customer.balance === 'number' ? customer.balance : 0,
    },
  }
}

// ── Phone normalization ─────────────────────────────────────────────────────

function normalizePhone(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const digits = trimmed.startsWith('+')
    ? trimmed.slice(1).replace(/\D/g, '')
    : trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return `+${digits}`
}

// ── Site access helpers ─────────────────────────────────────────────────────

async function getSiteGroupAdminIds(ownerAdminId: string): Promise<string[]> {
  const lowAdmins = await db.admin.findMany({
    where: {
      createdBy: ownerAdminId,
      role: 'LOW_ADMIN',
    },
    select: { id: true },
  })
  return [ownerAdminId, ...lowAdmins.map((a) => a.id)]
}

async function getOwnerAdminIdForCustomer(createdBy: string | null): Promise<string | null> {
  if (!createdBy) return null

  const creator = await db.admin.findUnique({
    where: { id: createdBy },
    select: { id: true, role: true, createdBy: true },
  })

  if (!creator) return createdBy
  if (creator.role === 'LOW_ADMIN') return creator.createdBy ?? creator.id
  return creator.id
}

// ── Query operations ─────────────────────────────────────────────────────────

/**
 * Get a website by subdomain for public viewing.
 */
export async function findSiteBySubdomain(subdomain: string): Promise<WebsiteDTO | null> {
  const website = await db.website.findUnique({
    where: { subdomain },
    select: WEBSITE_PUBLIC_SELECT,
  })

  if (!website) return null
  return toWebsiteDTO(website)
}

/**
 * Get admin website settings for the admin panel.
 */
export async function findAdminWebsiteSettings(
  adminId: string,
): Promise<AdminWebsiteSettingsDTO | null> {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { name: true },
  })
  const fallbackName = admin?.name || 'My Site'

  const website = await db.website.findUnique({
    where: { adminId },
    select: WEBSITE_ADMIN_SELECT,
  })

  const existingTheme = parseThemePayload(website?.theme)
  const stylePreset = SITE_STYLE_PRESETS.find((p) => p.id === existingTheme.styleVariant)
  const inferredSiteName = website
    ? parseSiteContent(website.content, fallbackName).about.title.en.replace(/^About\s+/, '') || fallbackName
    : fallbackName

  return {
    website: {
      id: website?.id ?? null,
      subdomain: website?.subdomain ?? '',
      siteName: inferredSiteName,
      styleVariant: stylePreset?.id ?? DEFAULT_STYLE_VARIANT,
      chatEnabled: false,
      style: stylePreset ?? SITE_STYLE_PRESETS[0],
    },
    presets: SITE_STYLE_PRESETS,
    renderPages: SITE_RENDER_PAGES,
    baseHost: process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000',
  }
}

/**
 * Get customer profile by customer ID.
 */
export async function findCustomerProfile(customerId: string): Promise<CustomerProfileDTO | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: CUSTOMER_PROFILE_SELECT,
  })

  if (!customer || !customer.isActive) return null
  return toCustomerProfileDTO(customer)
}

/**
 * Update customer profile fields.
 */
export async function updateCustomerProfile(
  customerId: string,
  data: CustomerProfileUpdateData,
): Promise<CustomerProfileDTO | null> {
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.preferences !== undefined) updateData.preferences = data.preferences
  if (data.calories !== undefined) {
    updateData.calories = typeof data.calories === 'string' ? parseInt(data.calories, 10) : data.calories
  }
  if (data.deliveryDays !== undefined) {
    updateData.deliveryDays = JSON.stringify(data.deliveryDays)
  }

  // Handle Google Maps link → extract coords
  if (typeof data.googleMapsLink === 'string' && data.googleMapsLink.trim().length > 0) {
    const parsedCoords = extractCoordsFromText(data.googleMapsLink.trim())
    if (parsedCoords) {
      updateData.latitude = parsedCoords.lat
      updateData.longitude = parsedCoords.lng
    }
    // Also set address from googleMapsLink if no explicit address
    if (data.address === undefined) {
      updateData.address = data.googleMapsLink.trim()
    }
  }

  if (data.address !== undefined && typeof data.address === 'string' && data.address.trim().length > 0) {
    updateData.address = data.address
  }

  const updated = await db.customer.update({
    where: { id: customerId },
    data: updateData,
    select: CUSTOMER_PROFILE_SELECT,
  })

  return toCustomerProfileDTO(updated)
}

/**
 * Get today's menu for a customer.
 */
export async function findTodayMenu(customerId: string): Promise<TodayMenuDTO | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: {
      calories: true,
      createdBy: true,
    },
  })

  if (!customer) return null

  // Dynamic import to avoid circular dependency issues
  const { getMenu, getTodaysMenuNumber, getDishImageUrl } = await import('@/lib/menuData')

  const menuNumber = getTodaysMenuNumber()
  const tier = customer.calories || 0
  const ownerAdminId = await getOwnerAdminIdForCustomer(customer.createdBy)

  type SetDish = {
    dishId?: number
    dishName?: string
    mealType?: string
  }

  type CalorieGroup = {
    calories?: number
    dishes?: SetDish[]
  }

  let setName: string | null = null
  let source: 'set' | 'default' = 'default'
  let dishes: TodayMenuDishDTO[] = []

  function normalizeMealType(value?: string): string {
    const upper = String(value || 'UNKNOWN').toUpperCase()
    if (['BREAKFAST', 'SECOND_BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'SIXTH_MEAL'].includes(upper)) {
      return upper
    }
    return 'UNKNOWN'
  }

  if (ownerAdminId) {
    const activeSet = await db.menuSet.findFirst({
      where: {
        adminId: ownerAdminId,
        isActive: true,
      },
      select: {
        name: true,
        calorieGroups: true,
      },
    })

    if (activeSet && activeSet.calorieGroups) {
      const groups = activeSet.calorieGroups as Record<string, CalorieGroup[]>
      const dayGroups = Array.isArray(groups?.[menuNumber.toString()]) ? groups[menuNumber.toString()] : []

      if (dayGroups.length > 0) {
        const selectedGroup =
          dayGroups.find((group) => Array.isArray(group?.dishes) && group.dishes.length > 0) || null

        if (selectedGroup && Array.isArray(selectedGroup.dishes)) {
          const fallbackMenu = getMenu(menuNumber)
          const fallbackById = new Map((fallbackMenu?.dishes || []).map((dish) => [dish.id, dish]))

          dishes = selectedGroup.dishes
            .filter((dish): dish is Required<Pick<SetDish, 'dishId'>> & SetDish => typeof dish?.dishId === 'number')
            .map((dish) => {
              const fallback = fallbackById.get(dish.dishId)
              return {
                id: dish.dishId,
                name: dish.dishName || fallback?.name || `Dish ${dish.dishId}`,
                mealType: normalizeMealType(dish.mealType || fallback?.mealType),
                imageUrl: getDishImageUrl(dish.dishId),
              }
            })

          if (dishes.length > 0) {
            source = 'set'
            setName = activeSet.name
          }
        }
      }
    }
  }

  if (dishes.length === 0) {
    const fallbackMenu = getMenu(menuNumber)
    dishes = (fallbackMenu?.dishes || []).map((dish) => ({
      id: dish.id,
      name: dish.name,
      mealType: normalizeMealType(dish.mealType),
      imageUrl: getDishImageUrl(dish.id),
    }))
    source = 'default'
  }

  return {
    menuNumber,
    tier,
    source,
    setName,
    dishes,
  }
}

/**
 * Get customer plan status.
 */
export async function findCustomerPlan(customerId: string): Promise<CustomerPlanDTO | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: CUSTOMER_PLAN_SELECT,
  })

  if (!customer) return null
  return {
    id: customer.id,
    autoOrdersEnabled: customer.autoOrdersEnabled,
  }
}

/**
 * Toggle customer plan (auto-orders enabled/disabled) and pause/resume orders.
 */
export async function toggleCustomerPlan(
  customerId: string,
  active: boolean,
): Promise<TogglePlanResult> {
  const updatedCustomer = await db.customer.update({
    where: { id: customerId },
    data: { autoOrdersEnabled: active },
    select: CUSTOMER_PLAN_SELECT,
  })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const dateScope = {
    OR: [
      { deliveryDate: { gte: todayStart } },
      { deliveryDate: { equals: null }, createdAt: { gte: todayStart } },
    ],
  }

  const PAUSE_STATUSES: OrderStatus[] = [
    OrderStatus.NEW,
    OrderStatus.PENDING,
    OrderStatus.IN_PROCESS,
    OrderStatus.IN_DELIVERY,
  ]

  if (!active) {
    await db.order.updateMany({
      where: {
        customerId,
        deletedAt: null,
        ...dateScope,
        orderStatus: { in: PAUSE_STATUSES },
      },
      data: { orderStatus: OrderStatus.PAUSED },
    })
  } else {
    await db.order.updateMany({
      where: {
        customerId,
        deletedAt: null,
        ...dateScope,
        orderStatus: OrderStatus.PAUSED,
      },
      data: { orderStatus: OrderStatus.NEW },
    })
  }

  return {
    success: true,
    customer: {
      id: updatedCustomer.id,
      autoOrdersEnabled: updatedCustomer.autoOrdersEnabled,
    },
  }
}

/**
 * List customer orders with date filtering.
 */
export async function listCustomerOrders(
  customerId: string,
  dateFilter: Prisma.OrderWhereInput = {},
): Promise<unknown[]> {
  const orders = await db.order.findMany({
    where: {
      customerId,
      deletedAt: null,
      ...dateFilter,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      courier: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  })

  return orders
}

// ── Command operations ───────────────────────────────────────────────────────

/**
 * Update or create a website for an admin.
 */
export async function upsertWebsite(
  adminId: string,
  data: { subdomain: string; siteName: string; styleVariant: SiteStyleVariant; chatEnabled?: boolean },
): Promise<SiteUpdateResult> {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { name: true },
  })
  const fallbackName = admin?.name || 'My Site'

  const normalizedVariant = getStylePreset(data.styleVariant).id
  const updatedTheme = buildThemePayload(normalizedVariant)

  const existing = await db.website.findUnique({
    where: { adminId },
    select: { id: true, content: true },
  })

  const existingContent = parseSiteContent(existing?.content, data.siteName || fallbackName)
  const updatedContent = updateSiteName(existingContent, data.siteName || fallbackName)

  const website = await db.website.upsert({
    where: { adminId },
    create: {
      adminId,
      subdomain: data.subdomain,
      theme: JSON.stringify(updatedTheme),
      content: JSON.stringify(updatedContent),
      chatEnabled: data.chatEnabled ?? false,
    },
    update: {
      subdomain: data.subdomain,
      theme: JSON.stringify(updatedTheme),
      content: JSON.stringify(updatedContent),
      chatEnabled: data.chatEnabled ?? false,
    },
    select: {
      id: true,
      subdomain: true,
      chatEnabled: true,
    },
  })

  const baseHost = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  return {
    success: true,
    website: {
      id: website.id,
      subdomain: website.subdomain,
      siteName: data.siteName,
      chatEnabled: false,
      styleVariant: updatedTheme.styleVariant,
    },
    urls: {
      pathUrl: `/sites/${website.subdomain}`,
      hostUrl: buildSubdomainUrl(website.subdomain, baseHost),
    },
  }
}

/**
 * Send OTP code for site customer authentication.
 */
export async function sendSiteOtpCode(
  subdomain: string,
  phone: string,
): Promise<SiteSendCodeResult> {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 16) {
    throw new Error('Invalid phone format')
  }

  const site = await db.website.findUnique({
    where: { subdomain },
    select: { id: true, adminId: true, subdomain: true, chatEnabled: true },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

  const customer = await db.customer.findFirst({
    where: {
      phone: normalizedPhone,
      deletedAt: null,
      createdBy: { in: groupAdminIds },
    },
    select: { id: true, isActive: true },
  })

  if (!customer) {
    throw new Error('Customer not found for this site')
  }

  if (!customer.isActive) {
    throw new Error('Customer account is inactive')
  }

  const sendStatus = canSendOtp(subdomain, normalizedPhone)
  if (!sendStatus.allowed) {
    const err = new Error('Please wait before requesting another code') as Error & { retryAfterSec?: number }
    err.retryAfterSec = Math.ceil((sendStatus.retryAfterMs || 0) / 1000)
    throw err
  }

  const otp = issueOtp(subdomain, normalizedPhone, 'login')
  const smsResult = await sendOtpSms(normalizedPhone, otp.code)

  if (!smsResult.ok) {
    const err = new Error(smsResult.error || 'Failed to send OTP SMS') as Error & { provider?: string }
    err.provider = smsResult.provider
    throw err
  }

  return {
    success: true,
    provider: smsResult.provider,
    expiresInSec: otp.expiresInSec,
    ...(process.env.NODE_ENV !== 'production' ? { debugCode: otp.code } : {}),
  }
}

/**
 * Verify OTP code for site customer authentication.
 */
export async function verifySiteOtpCode(
  subdomain: string,
  phone: string,
  code: string,
): Promise<SiteAuthResult> {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 16) {
    throw new Error('Invalid phone format')
  }

  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must contain exactly 6 digits')
  }

  const site = await db.website.findUnique({
    where: { subdomain },
    select: { id: true, adminId: true, subdomain: true },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const otpStatus = verifyOtp(subdomain, normalizedPhone, 'login', code)
  if (!otpStatus.ok) {
    const err = new Error(otpStatus.error) as Error & { attemptsLeft?: number }
    if ('attemptsLeft' in otpStatus) err.attemptsLeft = otpStatus.attemptsLeft
    throw err
  }

  const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

  // Prefer owner-admin customer record if duplicates exist
  let customer = await db.customer.findFirst({
    where: { phone: normalizedPhone, deletedAt: null, createdBy: site.adminId },
    select: CUSTOMER_AUTH_SELECT,
  })

  if (!customer) {
    customer = await db.customer.findFirst({
      where: { phone: normalizedPhone, deletedAt: null, createdBy: { in: groupAdminIds } },
      select: CUSTOMER_AUTH_SELECT,
    })
  }

  if (!customer) {
    throw new Error('Customer not found for this site')
  }

  if (!customer.isActive) {
    throw new Error('Customer account is inactive')
  }

  const token = createCustomerToken({
    id: customer.id,
    phone: customer.phone,
    websiteId: site.id,
    ownerAdminId: site.adminId,
    subdomain: site.subdomain,
  })

  return toSiteAuthResult(customer, token)
}

/**
 * Login customer on a site (without OTP, using password or direct).
 */
export async function siteLogin(
  subdomain: string,
  phone: string,
): Promise<SiteAuthResult> {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 16) {
    throw new Error('Invalid phone format')
  }

  const site = await db.website.findUnique({
    where: { subdomain },
    select: { id: true, adminId: true, subdomain: true },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

  // Prefer owner-admin customer record if duplicates exist
  let customer = await db.customer.findFirst({
    where: { phone: normalizedPhone, deletedAt: null, createdBy: site.adminId },
    select: CUSTOMER_AUTH_SELECT,
  })

  if (!customer) {
    customer = await db.customer.findFirst({
      where: { phone: normalizedPhone, deletedAt: null, createdBy: { in: groupAdminIds } },
      select: CUSTOMER_AUTH_SELECT,
    })
  }

  if (!customer) {
    throw new Error('Customer not found for this site')
  }

  if (!customer.isActive) {
    throw new Error('Customer account is inactive')
  }

  const token = createCustomerToken({
    id: customer.id,
    phone: customer.phone,
    websiteId: site.id,
    ownerAdminId: site.adminId,
    subdomain: site.subdomain,
  })

  return toSiteAuthResult(customer, token)
}

/**
 * Register a new customer on a site.
 */
export async function siteRegister(
  subdomain: string,
  phone: string,
  name?: string,
): Promise<SiteRegistrationResult> {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 16) {
    throw new Error('Invalid phone format')
  }

  const site = await db.website.findUnique({
    where: { subdomain },
    select: { id: true, adminId: true },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

  const existing = await db.customer.findFirst({
    where: {
      phone: normalizedPhone,
      deletedAt: null,
      createdBy: { in: groupAdminIds },
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error('Phone is already registered on this site')
  }

  const buildDefaultName = (p: string) => {
    const suffix = p.replace(/\D/g, '').slice(-4)
    return `Client ${suffix || 'new'}`
  }

  const customer = await db.customer.create({
    data: {
      name: name?.trim() || buildDefaultName(normalizedPhone),
      phone: normalizedPhone,
      address: 'Location not set',
      preferences: '',
      orderPattern: 'daily',
      isActive: true,
      autoOrdersEnabled: true,
      createdBy: site.adminId,
    },
    select: CUSTOMER_REGISTER_SELECT,
  })

  return {
    success: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    },
    message: 'Registered. Please login to receive SMS code.',
  }
}

/**
 * AI-edit website content.
 * This is a large operation that is kept in the repository layer
 * because it mixes Prisma writes with external API calls (Gemini).
 */
export async function aiEditWebsite(
  adminId: string,
  data: AiEditData,
): Promise<AiEditResult> {
  // This function is large but preserves the original business logic
  // from the monolithic route handler. Future refactors can split it.

  type ContentSection = 'hero' | 'features' | 'pricing' | 'about'
  const CONTENT_SECTIONS: ContentSection[] = ['hero', 'features', 'pricing', 'about']
  type EditMode = 'full_rebuild' | 'merge_existing' | 'section_patch'

  const EDIT_MODES: EditMode[] = ['full_rebuild', 'merge_existing', 'section_patch']

  function parseEditMode(value: unknown): EditMode {
    if (typeof value !== 'string') return 'full_rebuild'
    return EDIT_MODES.includes(value as EditMode) ? (value as EditMode) : 'full_rebuild'
  }

  function parseSections(value: unknown): ContentSection[] {
    if (!Array.isArray(value)) return []
    const seen = new Set<ContentSection>()
    for (const item of value) {
      if (typeof item !== 'string') continue
      if (CONTENT_SECTIONS.includes(item as ContentSection)) {
        seen.add(item as ContentSection)
      }
    }
    return Array.from(seen)
  }

  function inferStyleVariantFromPrompt(prompt: string, current: string): SiteStyleVariant {
    const normalized = prompt.toLowerCase()
    if (/(terminal|neon|cyber|dashboard|lime|matrix|tech)/.test(normalized)) return 'neo-terminal'
    if (/(retro|poster|bold|orange|editorial|campaign)/.test(normalized)) return 'retro-poster'
    if (/(paper|calm|minimal|luxury|serif|editorial|clean)/.test(normalized)) return 'nordic-paper'
    if (/(organic|warm|natural|earth|soft|healthy|wellness)/.test(normalized)) return 'organic-warm'
    return getStylePreset(current).id
  }

  function inferSectionsFromPrompt(prompt: string): ContentSection[] {
    const normalized = prompt.toLowerCase()
    const sections: ContentSection[] = []
    if (/(hero|headline|banner|first screen|above the fold)/.test(normalized)) sections.push('hero')
    if (/(feature|benefit|value prop|advantage)/.test(normalized)) sections.push('features')
    if (/(price|pricing|plan|tariff|cost|payment)/.test(normalized)) sections.push('pricing')
    if (/(about|company|story|mission|team)/.test(normalized)) sections.push('about')
    return Array.from(new Set(sections))
  }

  function mergeSections(
    current: GeneratedSiteContent,
    generated: GeneratedSiteContent,
    sections: ContentSection[],
  ): GeneratedSiteContent {
    if (sections.length === 0) return { ...current }
    const next: GeneratedSiteContent = {
      ...current,
      hero: current.hero,
      features: current.features,
      pricing: current.pricing,
      about: current.about,
    }
    for (const section of sections) {
      if (section === 'hero') next.hero = generated.hero
      if (section === 'features') next.features = generated.features
      if (section === 'pricing') next.pricing = generated.pricing
      if (section === 'about') next.about = generated.about
    }
    return next
  }

  function withSubdomainSuffix(base: string, index: number) {
    const suffix = `-${index}`
    const maxBaseLength = Math.max(3, 32 - suffix.length)
    const trimmedBase = base.slice(0, maxBaseLength).replace(/-+$/g, '')
    return normalizeSubdomain(`${trimmedBase}${suffix}`)
  }

  async function resolveAvailableSubdomain(
    candidate: string,
    targetAdminId: string,
    options: { autoResolve: boolean },
  ) {
    const normalizedCandidate = normalizeSubdomain(candidate)
    const isAllowed = (value: string) => isValidSubdomain(value) && !RESERVED_SUBDOMAINS.has(value)
    if (!isAllowed(normalizedCandidate)) {
      return { ok: false as const, error: 'Cannot apply update because the current subdomain is invalid or reserved.' }
    }

    const isTakenByAnotherAdmin = async (value: string) => {
      const conflict = await db.website.findFirst({
        where: { subdomain: value, NOT: { adminId: targetAdminId } },
        select: { id: true },
      })
      return Boolean(conflict)
    }

    const initiallyTaken = await isTakenByAnotherAdmin(normalizedCandidate)
    if (!initiallyTaken) {
      return { ok: true as const, subdomain: normalizedCandidate, subdomainAdjusted: false }
    }

    if (!options.autoResolve) {
      return { ok: false as const, error: 'Subdomain is already used by another middle-admin.' }
    }

    for (let index = 2; index <= 150; index += 1) {
      const candidateWithSuffix = withSubdomainSuffix(normalizedCandidate, index)
      if (!isAllowed(candidateWithSuffix)) continue
      const taken = await isTakenByAnotherAdmin(candidateWithSuffix)
      if (!taken) {
        return { ok: true as const, subdomain: candidateWithSuffix, subdomainAdjusted: true }
      }
    }

    return { ok: false as const, error: 'Unable to find an available subdomain variant. Try another base subdomain.' }
  }

  function buildFallbackSubdomain(adminName: string, adminId: string) {
    const namePart = normalizeSubdomain(adminName).slice(0, 18)
    const idPart = normalizeSubdomain(adminId).slice(0, 8)
    const candidate = normalizeSubdomain(`${namePart || 'site'}-${idPart || 'admin'}`)
    if (isValidSubdomain(candidate) && !RESERVED_SUBDOMAINS.has(candidate)) return candidate
    return `site-${idPart || 'admin'}`
  }

  // ── Implementation starts here ──

  const prompt = data.prompt.trim()
  const explicitApply = data.apply
  const dryRun = data.dryRun || data.previewOnly
  const apply = dryRun ? false : explicitApply !== false
  const mode = parseEditMode(data.mode)
  let requestedSections = parseSections(data.sections)
  const requestedSiteName = typeof data.siteName === 'string' ? data.siteName.trim().slice(0, 80) : ''
  const requestedSubdomainRaw = typeof data.subdomain === 'string' ? data.subdomain : ''
  const requestedSubdomain = normalizeSubdomain(requestedSubdomainRaw)
  const autoResolveSubdomain = data.autoResolveSubdomain !== false
  const requestedStyleVariant = typeof data.styleVariant === 'string' ? data.styleVariant : ''
  const includeContentPreview = data.includeContentPreview !== false
  const targetAdminId = typeof data.targetAdminId === 'string' && data.targetAdminId ? data.targetAdminId : adminId

  if (prompt.length < 10) {
    throw new Error('Prompt must be at least 10 characters.')
  }

  const editableAdminId = targetAdminId

  if (mode === 'section_patch' && requestedSections.length === 0) {
    requestedSections = inferSectionsFromPrompt(prompt)
  }

  const admin = await db.admin.findUnique({
    where: { id: editableAdminId },
    select: { id: true, name: true },
  })

  if (!admin) {
    throw new Error('Target admin not found.')
  }

  const fallbackName = admin?.name?.trim() || 'My Site'

  const existing = await db.website.findUnique({
    where: { adminId: editableAdminId },
    select: { id: true, subdomain: true, content: true, theme: true },
  })

  const currentContent = parseSiteContent(existing?.content, fallbackName)
  const inferredSiteName =
    currentContent.about?.title?.en?.replace(/^About\s+/, '')?.trim() || fallbackName

  const currentVariant = parseThemePayload(existing?.theme).styleVariant || DEFAULT_STYLE_VARIANT
  const generatedContent = await generateWebsiteContent(prompt)
  const themedVariant: SiteStyleVariant = requestedStyleVariant
    ? getStylePreset(requestedStyleVariant).id
    : inferStyleVariantFromPrompt(prompt, currentVariant)
  const nextSiteName = requestedSiteName || inferredSiteName

  const sectionsToApply: ContentSection[] =
    mode === 'full_rebuild'
      ? [...CONTENT_SECTIONS]
      : requestedSections.length > 0
        ? requestedSections
        : [...CONTENT_SECTIONS]

  let updatedContent: GeneratedSiteContent
  if (mode === 'full_rebuild') {
    updatedContent = generatedContent
  } else {
    updatedContent = mergeSections(currentContent, generatedContent, sectionsToApply)
  }
  updatedContent = updateSiteName(updatedContent, nextSiteName)

  const baseHost = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  if (!apply) {
    const previewFallback = existing?.subdomain || buildFallbackSubdomain(fallbackName, editableAdminId)
    const previewRequestedValid =
      requestedSubdomain.length > 0 &&
      isValidSubdomain(requestedSubdomain) &&
      !RESERVED_SUBDOMAINS.has(requestedSubdomain)
    const previewSubdomain = previewRequestedValid ? requestedSubdomain : previewFallback

    return {
      success: true,
      applied: false,
      mode,
      updatedSections: sectionsToApply,
      message: 'Generated website content preview only. Re-run with apply=true to persist changes.',
      website: {
        subdomain: previewSubdomain,
        requestedSubdomain: requestedSubdomain || undefined,
        subdomainAdjusted: Boolean(requestedSubdomain && requestedSubdomain !== previewSubdomain),
        siteName: nextSiteName,
        styleVariant: themedVariant,
      },
      renderPages: SITE_RENDER_PAGES,
      urls: {
        pathUrl: `/sites/${previewSubdomain}`,
        hostUrl: buildSubdomainUrl(previewSubdomain, baseHost),
      },
      ...(includeContentPreview ? { content: updatedContent } : {}),
    }
  }

  const subdomainCandidate =
    requestedSubdomain || existing?.subdomain || buildFallbackSubdomain(fallbackName, editableAdminId)
  const resolvedSubdomain = await resolveAvailableSubdomain(subdomainCandidate, editableAdminId, {
    autoResolve: autoResolveSubdomain,
  })

  if (!resolvedSubdomain.ok) {
    throw new Error(resolvedSubdomain.error)
  }
  const subdomain = resolvedSubdomain.subdomain

  const updatedTheme = buildThemePayload(themedVariant)

  const website = await db.website.upsert({
    where: { adminId: editableAdminId },
    create: {
      adminId: editableAdminId,
      subdomain,
      theme: JSON.stringify(updatedTheme),
      content: JSON.stringify(updatedContent),
      chatEnabled: false,
    },
    update: {
      subdomain,
      theme: JSON.stringify(updatedTheme),
      content: JSON.stringify(updatedContent),
      chatEnabled: false,
    },
    select: { id: true, subdomain: true },
  })

  return {
    success: true,
    applied: true,
    mode,
    updatedSections: sectionsToApply,
    message: 'Subdomain website content updated from AI prompt.',
    website: {
      id: website.id,
      subdomain: website.subdomain,
      requestedSubdomain: requestedSubdomain || undefined,
      subdomainAdjusted: resolvedSubdomain.subdomainAdjusted,
      siteName: nextSiteName,
      styleVariant: themedVariant,
    },
    renderPages: SITE_RENDER_PAGES,
    urls: {
      pathUrl: `/sites/${website.subdomain}`,
      hostUrl: buildSubdomainUrl(website.subdomain, baseHost),
    },
    ...(includeContentPreview ? { content: updatedContent } : {}),
  }
}

/**
 * Get the site group admin IDs for a given owner admin.
 */
export { getSiteGroupAdminIds, normalizePhone }
