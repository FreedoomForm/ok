/**
 * Sites DTOs — Data Transfer Objects for the Sites / multi-tenant module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 */

import type { GeneratedSiteContent } from '@/lib/ai-site-generator'
import type { SitePalette, SiteStyleVariant } from '@/lib/site-builder'

// ── Website (public site data) ───────────────────────────────────────────────

export interface WebsiteDTO {
  id: string
  subdomain: string
  adminId: string
  chatEnabled: boolean
  styleVariant: SiteStyleVariant
  palette: SitePalette
  siteName: string
  content: GeneratedSiteContent
}

// ── Admin Website Settings (admin panel view) ───────────────────────────────

export interface AdminWebsiteSettingsDTO {
  website: {
    id: string | null
    subdomain: string
    siteName: string
    styleVariant: SiteStyleVariant
    chatEnabled: boolean
    style: {
      id: SiteStyleVariant
      title: string
      description: string
      headingClass: string
      bodyClass: string
      palette: SitePalette
    }
  }
  presets: Array<{
    id: SiteStyleVariant
    title: string
    description: string
    headingClass: string
    bodyClass: string
    palette: SitePalette
  }>
  renderPages: ReadonlyArray<{ id: string; label: string }>
  baseHost: string
}

// ── Site Update Data (admin) ────────────────────────────────────────────────

export interface SiteUpdateData {
  subdomain: string
  siteName: string
  styleVariant: SiteStyleVariant
  chatEnabled?: boolean
}

export interface SiteUpdateResult {
  success: boolean
  website: {
    id: string
    subdomain: string
    siteName: string
    chatEnabled: boolean
    styleVariant: SiteStyleVariant
  }
  urls: {
    pathUrl: string
    hostUrl: string
  }
}

// ── AI Edit ──────────────────────────────────────────────────────────────────

export interface AiEditData {
  prompt: string
  apply?: boolean
  dryRun?: boolean
  previewOnly?: boolean
  mode?: 'full_rebuild' | 'merge_existing' | 'section_patch'
  sections?: string[]
  siteName?: string
  subdomain?: string
  autoResolveSubdomain?: boolean
  styleVariant?: string
  includeContentPreview?: boolean
  targetAdminId?: string
}

export interface AiEditResult {
  success: boolean
  applied: boolean
  mode: string
  updatedSections: string[]
  message: string
  website: {
    id?: string
    subdomain: string
    requestedSubdomain?: string
    subdomainAdjusted?: boolean
    siteName: string
    styleVariant: SiteStyleVariant
  }
  renderPages: ReadonlyArray<{ id: string; label: string }>
  urls: {
    pathUrl: string
    hostUrl: string
  }
  content?: GeneratedSiteContent
}

// ── Customer Profile (site-facing) ──────────────────────────────────────────

export interface CustomerProfileDTO {
  id: string
  name: string
  phone: string
  address: string
  balance: number
  calories: number
  planType: string
  dailyPrice: number
  autoOrdersEnabled: boolean
  deliveryDays: Record<string, boolean> | null
  preferences: string | null
  googleMapsLink: string
  latitude: number | null
  longitude: number | null
  isActive: boolean
  createdAt: string
}

// ── Customer Profile Update ─────────────────────────────────────────────────

export interface CustomerProfileUpdateData {
  name?: string
  address?: string
  preferences?: string
  calories?: number | string
  deliveryDays?: Record<string, boolean>
  googleMapsLink?: string
}

// ── Site Auth Result ────────────────────────────────────────────────────────

export interface SiteAuthResult {
  success: boolean
  token: string
  customer: {
    id: string
    name: string
    phone: string
    address: string
    balance: number
  }
}

// ── Site Send Code Result ───────────────────────────────────────────────────

export interface SiteSendCodeResult {
  success: boolean
  provider: string
  expiresInSec: number
  debugCode?: string
}

// ── Site Registration Data ──────────────────────────────────────────────────

export interface SiteRegistrationData {
  phone: string
  name?: string
}

export interface SiteRegistrationResult {
  success: boolean
  customer: {
    id: string
    name: string
    phone: string
  }
  message: string
}

// ── Customer Plan ───────────────────────────────────────────────────────────

export interface CustomerPlanDTO {
  id: string
  autoOrdersEnabled: boolean
}

export interface TogglePlanResult {
  success: boolean
  customer: {
    id: string
    autoOrdersEnabled: boolean
  }
}

// ── Today Menu ──────────────────────────────────────────────────────────────

export interface TodayMenuDishDTO {
  id: number
  name: string
  mealType: string
  imageUrl: string
}

export interface TodayMenuDTO {
  menuNumber: number
  tier: number
  source: 'set' | 'default'
  setName: string | null
  dishes: TodayMenuDishDTO[]
}

// ── Customer Logout ─────────────────────────────────────────────────────────

export interface CustomerLogoutResult {
  success: boolean
}
