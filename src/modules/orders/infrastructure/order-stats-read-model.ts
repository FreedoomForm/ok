/**
 * Order Stats Read Model — Pre-computed dashboard statistics.
 *
 * Reads from DailyOrderStats and AdminDashboardCounters tables
 * instead of computing aggregates from raw orders on every request.
 *
 * Fallback: if read model data is stale or missing, computes from
 * raw data and updates the read model for future requests.
 */

import { db } from '@/modules/shared/db'
import type { OrderStats } from '../contracts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardCountersRow {
  id: string
  adminId: string
  totalClients: number
  activeClients: number
  totalCouriers: number
  totalOrders: number
  pendingOrders: number
  todayRevenue: number
  statsSnapshot: OrderStats | null
  updatedAt: Date
}

/** How stale is too stale before we recompute (5 minutes) */
const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000

// ── Read model queries ──────────────────────────────────────────────────────

/**
 * Get order stats from the read model.
 * Returns the full OrderStats if the read model data is fresh,
 * or null if no data exists / data is stale.
 */
export async function getOrderStatsFromReadModel(
  adminId: string,
): Promise<OrderStats | null> {
  const counters = await db.adminDashboardCounters.findUnique({
    where: { adminId },
  })

  if (!counters) return null

  // Check freshness
  const age = Date.now() - counters.updatedAt.getTime()
  if (age > FRESHNESS_THRESHOLD_MS) return null

  // Return the stored stats snapshot
  if (!counters.statsSnapshot) return null

  return counters.statsSnapshot as unknown as OrderStats
}

/**
 * Get dashboard counters from the read model.
 * Returns null if no data exists or data is stale.
 */
export async function getDashboardCounters(
  adminId: string,
): Promise<DashboardCountersRow | null> {
  const counters = await db.adminDashboardCounters.findUnique({
    where: { adminId },
  })

  if (!counters) return null

  // Check freshness
  const age = Date.now() - counters.updatedAt.getTime()
  if (age > FRESHNESS_THRESHOLD_MS) return null

  return {
    id: counters.id,
    adminId: counters.adminId,
    totalClients: counters.totalClients,
    activeClients: counters.activeClients,
    totalCouriers: counters.totalCouriers,
    totalOrders: counters.totalOrders,
    pendingOrders: counters.pendingOrders,
    todayRevenue: counters.todayRevenue,
    statsSnapshot: counters.statsSnapshot as OrderStats | null,
    updatedAt: counters.updatedAt,
  }
}

// ── Write model (upsert) ────────────────────────────────────────────────────

/**
 * Update the read model with computed OrderStats.
 * Called after computing stats from raw data.
 */
export async function updateOrderStatsReadModel(
  adminId: string,
  stats: OrderStats,
): Promise<void> {
  const groupAdminIds = await getGroupAdminIdsForAggregation(adminId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const orderWhere = {
    adminId: { in: groupAdminIds },
    deletedAt: null,
  }

  const todayOrderWhere = {
    ...orderWhere,
    createdAt: { gte: today, lt: tomorrow },
  }

  const [
    totalClients,
    activeClients,
    totalCouriers,
    totalOrders,
    pendingOrders,
    todayRevenueResult,
  ] = await Promise.all([
    db.customer.count({
      where: { createdBy: { in: groupAdminIds }, deletedAt: null },
    }),
    db.customer.count({
      where: { createdBy: { in: groupAdminIds }, deletedAt: null, isActive: true },
    }),
    db.admin.count({
      where: { role: 'COURIER', isActive: true, createdBy: { in: groupAdminIds } },
    }),
    db.order.count({ where: orderWhere }),
    db.order.count({
      where: { ...orderWhere, orderStatus: { in: ['NEW', 'PENDING', 'IN_PROCESS'] } },
    }),
    db.order.aggregate({
      where: {
        ...todayOrderWhere,
        orderStatus: 'DELIVERED',
        amountReceived: { not: null },
      },
      _sum: { amountReceived: true },
    }),
  ])

  const todayRevenue = Number(todayRevenueResult._sum.amountReceived ?? 0)

  await db.adminDashboardCounters.upsert({
    where: { adminId },
    create: {
      adminId,
      totalClients,
      activeClients,
      totalCouriers,
      totalOrders,
      pendingOrders,
      todayRevenue,
      statsSnapshot: stats as any,
    },
    update: {
      totalClients,
      activeClients,
      totalCouriers,
      totalOrders,
      pendingOrders,
      todayRevenue,
      statsSnapshot: stats as any,
    },
  })
}

/**
 * Aggregate and upsert daily order stats for a given admin and date.
 */
export async function upsertDailyOrderStats(
  adminId: string,
  date: Date,
): Promise<void> {
  const groupAdminIds = await getGroupAdminIdsForAggregation(adminId)

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const where = {
    adminId: { in: groupAdminIds },
    createdAt: { gte: dayStart, lt: dayEnd },
    deletedAt: null,
  }

  const [totalOrders, deliveredOrders, cancelledOrders, revenueResult] =
    await Promise.all([
      db.order.count({ where }),
      db.order.count({ where: { ...where, orderStatus: 'DELIVERED' } }),
      db.order.count({ where: { ...where, orderStatus: 'CANCELED' } }),
      db.order.aggregate({
        where: { ...where, orderStatus: 'DELIVERED', amountReceived: { not: null } },
        _sum: { amountReceived: true },
      }),
    ])

  const totalRevenue = Number(revenueResult._sum.amountReceived ?? 0)

  // Calculate average delivery time for delivered orders
  const deliveredWithTimes = await db.order.findMany({
    where: {
      ...where,
      orderStatus: 'DELIVERED',
      assignedAt: { not: null },
      deliveredAt: { not: null },
    },
    select: { assignedAt: true, deliveredAt: true },
  })

  const avgDeliveryTime = deliveredWithTimes.length > 0
    ? Math.round(
        deliveredWithTimes.reduce((sum, o) => {
          const diff = (o.deliveredAt!.getTime() - o.assignedAt!.getTime()) / 60000
          return sum + diff
        }, 0) / deliveredWithTimes.length,
      )
    : 0

  await db.dailyOrderStats.upsert({
    where: {
      date_adminId: { date: dayStart, adminId },
    },
    create: {
      date: dayStart,
      adminId,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      averageDeliveryTime: avgDeliveryTime,
    },
    update: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      averageDeliveryTime: avgDeliveryTime,
    },
  })
}

/**
 * Update AdminDashboardCounters for a given admin.
 * Also computes and stores the full OrderStats snapshot.
 */
export async function upsertDashboardCounters(
  adminId: string,
): Promise<void> {
  const groupAdminIds = await getGroupAdminIdsForAggregation(adminId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const orderWhere = {
    adminId: { in: groupAdminIds },
    deletedAt: null,
  }

  const todayOrderWhere = {
    ...orderWhere,
    createdAt: { gte: today, lt: tomorrow },
  }

  const [
    totalClients,
    activeClients,
    totalCouriers,
    totalOrders,
    pendingOrders,
    todayRevenueResult,
  ] = await Promise.all([
    db.customer.count({
      where: { createdBy: { in: groupAdminIds }, deletedAt: null },
    }),
    db.customer.count({
      where: { createdBy: { in: groupAdminIds }, deletedAt: null, isActive: true },
    }),
    db.admin.count({
      where: { role: 'COURIER', isActive: true, createdBy: { in: groupAdminIds } },
    }),
    db.order.count({ where: orderWhere }),
    db.order.count({
      where: { ...orderWhere, orderStatus: { in: ['NEW', 'PENDING', 'IN_PROCESS'] } },
    }),
    db.order.aggregate({
      where: {
        ...todayOrderWhere,
        orderStatus: 'DELIVERED',
        amountReceived: { not: null },
      },
      _sum: { amountReceived: true },
    }),
  ])

  const todayRevenue = Number(todayRevenueResult._sum.amountReceived ?? 0)

  await db.adminDashboardCounters.upsert({
    where: { adminId },
    create: {
      adminId,
      totalClients,
      activeClients,
      totalCouriers,
      totalOrders,
      pendingOrders,
      todayRevenue,
    },
    update: {
      totalClients,
      activeClients,
      totalCouriers,
      totalOrders,
      pendingOrders,
      todayRevenue,
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get admin IDs in the group for aggregation scoping.
 * For SUPER_ADMIN: all admins.
 * For MIDDLE_ADMIN: self + created LOW_ADMINs.
 */
async function getGroupAdminIdsForAggregation(
  adminId: string,
): Promise<string[]> {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { id: true, role: true },
  })

  if (!admin) return [adminId]

  if (admin.role === 'SUPER_ADMIN') {
    const allAdmins = await db.admin.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })
    return allAdmins.map((a) => a.id)
  }

  if (admin.role === 'MIDDLE_ADMIN') {
    const subAdmins = await db.admin.findMany({
      where: { createdBy: adminId, deletedAt: null },
      select: { id: true },
    })
    return [adminId, ...subAdmins.map((a) => a.id)]
  }

  // LOW_ADMIN — use group admin IDs
  const self = await db.admin.findUnique({
    where: { id: adminId },
    select: { createdBy: true },
  })

  if (self?.createdBy) {
    const siblings = await db.admin.findMany({
      where: { createdBy: self.createdBy, deletedAt: null },
      select: { id: true },
    })
    return [self.createdBy, ...siblings.map((a) => a.id)]
  }

  return [adminId]
}
