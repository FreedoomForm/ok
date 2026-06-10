/**
 * Admins Repository — Data access layer for the Admin management module.
 *
 * Encapsulates all Prisma queries for admin, feature, menu-set,
 * action-log and related operations, providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 */

import { db } from '@/modules/shared/db'
import { Prisma } from '@prisma/client'
import { safeJsonParse } from '@/lib/safe-json'
import type {
  AdminDTO,
  AdminListItem,
  AdminDetail,
  AdminRoleString,
  UsersListItem,
  ActionLogDTO,
  ActionLogListResult,
  FeatureDTO,
  MenuSetDTO,
} from '../contracts'

// ── Prisma select presets ────────────────────────────────────────────────────

/** Admin select for current-user (me) endpoint. */
const ADMIN_ME_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdBy: true,
  allowedTabs: true,
} as const

/** Admin select for list views. */
const ADMIN_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdBy: true,
  allowedTabs: true,
  createdAt: true,
  salary: true,
  creator: { select: { name: true } },
} as const

/** Admin select for detail view. */
const ADMIN_DETAIL_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdBy: true,
  allowedTabs: true,
  createdAt: true,
  salary: true,
  hasPassword: true,
} as const

/** Admin select for users-list (action-logs filter). */
const ADMIN_USERS_SELECT = {
  id: true,
  name: true,
  role: true,
} as const

/** Admin select for password verification. */
const ADMIN_PASSWORD_SELECT = {
  id: true,
  password: true,
  hasPassword: true,
  name: true,
  email: true,
} as const

/** Admin select for auth checks (ownership). */
const ADMIN_OWNERSHIP_SELECT = {
  id: true,
  role: true,
  createdBy: true,
  name: true,
  email: true,
  isActive: true,
} as const

/** Admin select for middle-admin list. */
const MIDDLE_ADMIN_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type AdminMeRow = Prisma.AdminGetPayload<{ select: typeof ADMIN_ME_SELECT }>
type AdminListRow = Prisma.AdminGetPayload<{ select: typeof ADMIN_LIST_SELECT }>
type AdminDetailRow = Prisma.AdminGetPayload<{ select: typeof ADMIN_DETAIL_SELECT }>
type AdminOwnershipRow = Prisma.AdminGetPayload<{ select: typeof ADMIN_OWNERSHIP_SELECT }>

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseAllowedTabs(raw: string | null): string[] | null {
  if (raw == null) return null
  const parsed = safeJsonParse<unknown>(raw, [])
  return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
}

// ── Transformers ─────────────────────────────────────────────────────────────

function toAdminDTO(row: AdminMeRow): AdminDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as AdminRoleString,
    isActive: row.isActive,
    createdBy: row.createdBy,
    allowedTabs: parseAllowedTabs(row.allowedTabs),
  }
}

function toAdminListItem(row: AdminListRow): AdminListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as AdminRoleString,
    isActive: row.isActive,
    createdBy: row.createdBy,
    allowedTabs: parseAllowedTabs(row.allowedTabs),
    createdAt: row.createdAt.toISOString(),
    salary: row.salary,
    creatorName: row.creator?.name ?? null,
  }
}

function toAdminDetail(row: AdminDetailRow): AdminDetail {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as AdminRoleString,
    isActive: row.isActive,
    createdBy: row.createdBy,
    allowedTabs: parseAllowedTabs(row.allowedTabs),
    createdAt: row.createdAt.toISOString(),
    salary: row.salary,
    hasPassword: row.hasPassword,
  }
}

function toUsersListItem(row: Prisma.AdminGetPayload<{ select: typeof ADMIN_USERS_SELECT }>): UsersListItem {
  return {
    id: row.id,
    name: row.name,
    role: row.role as AdminRoleString,
  }
}

function toFeatureDTO(row: Prisma.FeatureGetPayload<Record<string, never>>): FeatureDTO {
  const options = row.options as unknown
  return {
    id: row.id,
    ownerAdminId: row.ownerAdminId,
    name: row.name,
    description: row.description,
    type: row.type as 'TEXT' | 'SELECT',
    options: Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : null,
    createdAt: row.createdAt.toISOString(),
  }
}

function toMenuSetDTO(row: Prisma.MenuSetGetPayload<Record<string, never>>): MenuSetDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    menuNumber: row.menuNumber,
    calorieGroups: row.calorieGroups,
    isActive: row.isActive,
    adminId: row.adminId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ── Query operations ─────────────────────────────────────────────────────────

/**
 * Find current admin (for /me endpoint).
 */
export async function findCurrentAdmin(adminId: string): Promise<AdminDTO | null> {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: ADMIN_ME_SELECT,
  })
  if (!admin) return null
  return toAdminDTO(admin)
}

/**
 * List low-admins (LOW_ADMIN, COURIER, WORKER) scoped by user role.
 */
export async function listLowAdmins(
  user: { id: string; role: string },
  ownerAdminId: string | null,
): Promise<AdminListItem[]> {
  const where: Prisma.AdminWhereInput = {
    role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] },
  }

  if (user.role === 'MIDDLE_ADMIN') {
    where.createdBy = user.id
  } else if (user.role === 'LOW_ADMIN' && ownerAdminId) {
    where.createdBy = ownerAdminId
  }

  const rows = await db.admin.findMany({
    where,
    select: ADMIN_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map(toAdminListItem)
}

/**
 * List middle-admins (SUPER_ADMIN only).
 */
export async function listMiddleAdmins(): Promise<AdminListItem[]> {
  const rows = await db.admin.findMany({
    where: { role: 'MIDDLE_ADMIN' },
    select: MIDDLE_ADMIN_LIST_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as AdminRoleString,
    isActive: row.isActive,
    createdBy: null,
    allowedTabs: null,
    createdAt: row.createdAt.toISOString(),
    salary: 0,
    creatorName: null,
  }))
}

/**
 * Get admin detail by ID.
 */
export async function findAdminDetail(adminId: string): Promise<AdminDetail | null> {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: ADMIN_DETAIL_SELECT,
  })
  if (!admin) return null
  return toAdminDetail(admin)
}

/**
 * Find admin for ownership/permission checks.
 */
export async function findAdminForOwnership(adminId: string): Promise<AdminOwnershipRow | null> {
  return db.admin.findUnique({
    where: { id: adminId },
    select: ADMIN_OWNERSHIP_SELECT,
  })
}

/**
 * Find admin with password hash (for password verification).
 */
export async function findAdminWithPassword(adminId: string) {
  return db.admin.findUnique({
    where: { id: adminId },
    select: ADMIN_PASSWORD_SELECT,
  })
}

/**
 * Check if an email is already taken.
 */
export async function isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
  const where: Prisma.AdminWhereInput = { email }
  if (excludeId) {
    where.NOT = { id: excludeId }
  }
  const existing = await db.admin.findFirst({ where, select: { id: true } })
  return !!existing
}

/**
 * List users for action-logs filter.
 */
export async function listUsersForLogs(
  user: { id: string; role: string },
  groupAdminIds: string[] | null,
): Promise<UsersListItem[]> {
  const where: Prisma.AdminWhereInput = {}

  if (user.role !== 'SUPER_ADMIN') {
    const allowedIds = groupAdminIds ?? [user.id]
    where.id = { in: allowedIds }
  }

  const rows = await db.admin.findMany({
    where,
    select: ADMIN_USERS_SELECT,
    orderBy: { name: 'asc' },
  })

  return rows.map(toUsersListItem)
}

// ── Action Log queries ───────────────────────────────────────────────────────

/**
 * List action logs with filters and pagination.
 */
export async function listActionLogs(params: {
  adminId?: string
  groupAdminIds?: string[] | null
  date?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}): Promise<ActionLogListResult> {
  const where: Prisma.ActionLogWhereInput = {}

  // Date filtering
  if (params.date) {
    const date = new Date(params.date)
    if (!isNaN(date.getTime())) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.createdAt = { gte: startOfDay, lte: endOfDay }
    }
  } else if (params.from || params.to) {
    const createdAt: { gte?: Date; lte?: Date } = {}
    if (params.from) {
      const from = new Date(params.from)
      if (!isNaN(from.getTime())) {
        const start = new Date(from)
        start.setHours(0, 0, 0, 0)
        createdAt.gte = start
      }
    }
    if (params.to) {
      const to = new Date(params.to)
      if (!isNaN(to.getTime())) {
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        createdAt.lte = end
      }
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt
    }
  }

  // Role-based admin filtering
  if (params.adminId && params.adminId !== 'all') {
    where.adminId = params.adminId
  } else if (params.groupAdminIds) {
    where.adminId = { in: params.groupAdminIds }
  }

  const limit = params.limit ?? 50
  const offset = params.offset ?? 0

  const [logs, total] = await Promise.all([
    db.actionLog.findMany({
      where,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.actionLog.count({ where }),
  ])

  return {
    logs: logs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      description: log.description,
      createdAt: log.createdAt.toISOString(),
      admin: log.admin
        ? {
            name: log.admin.name,
            email: log.admin.email,
            role: log.admin.role as AdminRoleString,
          }
        : null,
    })),
    total,
    hasMore: offset + limit < total,
  }
}

// ── Feature queries ──────────────────────────────────────────────────────────

/**
 * List features for an owner admin.
 */
export async function listFeatures(ownerAdminId: string): Promise<FeatureDTO[]> {
  const rows = await db.feature.findMany({
    where: { ownerAdminId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toFeatureDTO)
}

/**
 * Find a feature by ID and owner admin.
 */
export async function findFeatureForOwner(id: string, ownerAdminId: string) {
  return db.feature.findFirst({
    where: { id, ownerAdminId },
    select: { id: true },
  })
}

/**
 * Create a feature.
 */
export async function createFeature(
  ownerAdminId: string,
  data: { name: string; description: string; type: 'TEXT' | 'SELECT'; options?: string[] | null },
) {
  return db.feature.create({
    data: {
      ownerAdminId,
      name: data.name,
      description: data.description,
      type: data.type,
      ...(data.options ? { options: data.options as unknown as Prisma.InputJsonValue } : {}),
    },
  })
}

/**
 * Delete a feature.
 */
export async function deleteFeature(id: string) {
  return db.feature.delete({ where: { id } })
}

// ── Menu Set queries ─────────────────────────────────────────────────────────

/**
 * List menu sets with optional admin scope.
 */
export async function listMenuSets(where: Prisma.MenuSetWhereInput): Promise<MenuSetDTO[]> {
  const rows = await db.menuSet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toMenuSetDTO)
}

/**
 * Find a menu set by ID.
 */
export async function findMenuSet(id: string) {
  return db.menuSet.findUnique({ where: { id } })
}

/**
 * Create a menu set.
 */
export async function createMenuSet(data: Prisma.MenuSetCreateInput) {
  return db.menuSet.create({ data })
}

/**
 * Update a menu set.
 */
export async function updateMenuSet(id: string, data: Prisma.MenuSetUpdateInput) {
  return db.menuSet.update({ where: { id }, data })
}

/**
 * Deactivate other menu sets for the same admin (when activating one).
 */
export async function deactivateOtherMenuSets(id: string, adminId: string) {
  return db.menuSet.updateMany({
    where: { id: { not: id }, adminId },
    data: { isActive: false },
  })
}

/**
 * Delete a menu set.
 */
export async function deleteMenuSet(id: string) {
  return db.menuSet.delete({ where: { id } })
}

// ── Command operations ───────────────────────────────────────────────────────

/**
 * Create a low admin (LOW_ADMIN, COURIER, WORKER).
 */
export async function createLowAdmin(data: {
  email: string
  password: string | null
  name: string
  role: 'LOW_ADMIN' | 'COURIER' | 'WORKER'
  allowedTabs: string[] | null
  salary: number
  createdBy: string
  hasPassword: boolean
}) {
  return db.admin.create({
    data: {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      isActive: true,
      createdBy: data.createdBy,
      allowedTabs: data.allowedTabs && data.allowedTabs.length > 0 ? JSON.stringify(data.allowedTabs) : null,
      salary: data.salary,
      hasPassword: data.hasPassword,
    },
    select: ADMIN_DETAIL_SELECT,
  })
}

/**
 * Create a middle admin.
 */
export async function createMiddleAdmin(data: {
  email: string
  password: string
  name: string
  createdBy: string
}) {
  return db.admin.create({
    data: {
      email: data.email,
      password: data.password,
      name: data.name,
      role: 'MIDDLE_ADMIN',
      isActive: true,
      createdBy: data.createdBy,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })
}

/**
 * Update a low admin.
 */
export async function updateLowAdmin(
  adminId: string,
  data: {
    name?: string
    email?: string
    role?: string
    isActive?: boolean
    allowedTabs?: string[] | null
    salary?: number
    password?: string
    hasPassword?: boolean
  },
) {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.role !== undefined) updateData.role = data.role
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if ('allowedTabs' in data) {
    updateData.allowedTabs =
      Array.isArray(data.allowedTabs) && data.allowedTabs.length > 0
        ? JSON.stringify(data.allowedTabs)
        : null
  }
  if (data.salary !== undefined) updateData.salary = data.salary
  if (data.password !== undefined) {
    updateData.password = data.password
    updateData.hasPassword = true
  }

  return db.admin.update({
    where: { id: adminId },
    data: updateData,
    select: ADMIN_DETAIL_SELECT,
  })
}

/**
 * Update a middle admin (by SUPER_ADMIN).
 */
export async function updateMiddleAdmin(
  adminId: string,
  data: { name?: string; email?: string },
) {
  return db.admin.update({
    where: { id: adminId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })
}

/**
 * Update admin profile (self-edit).
 */
export async function updateAdminProfile(
  adminId: string,
  data: { name: string; email: string; password?: string },
) {
  const updateData: Record<string, unknown> = { name: data.name, email: data.email }
  if (data.password) updateData.password = data.password

  return db.admin.update({
    where: { id: adminId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  })
}

/**
 * Update admin password.
 */
export async function updateAdminPassword(adminId: string, hashedPassword: string) {
  return db.admin.update({
    where: { id: adminId },
    data: { password: hashedPassword, hasPassword: true },
  })
}

/**
 * Toggle admin active status.
 */
export async function toggleAdminStatus(adminId: string, isActive: boolean) {
  return db.admin.update({
    where: { id: adminId },
    data: { isActive },
  })
}

/**
 * Delete an admin.
 */
export async function deleteAdmin(adminId: string) {
  return db.admin.delete({ where: { id: adminId } })
}

/**
 * Log an action (append-only audit trail).
 */
export async function logAction(data: {
  adminId: string
  action: string
  entityType?: string
  entityId?: string
  description?: string
  oldValues?: string
  newValues?: string
}) {
  try {
    return await db.actionLog.create({ data })
  } catch {
    // Don't fail the request if logging fails
    return null
  }
}
