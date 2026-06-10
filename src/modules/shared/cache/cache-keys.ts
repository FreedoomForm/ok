/**
 * Cache key builder and TTL constants.
 *
 * Key format: {module}:{resource}:{id}:{scope}
 *
 * TTL buckets follow the Backend Design System (Section 14):
 * - B0: 15s — admin info, permissions (hot, changes rarely)
 * - B1: 30s — order lists, stats, customer lists
 * - B2: 60s — audit logs, messages, dashboard views
 * - B3: 300s — reports, exports, financial balances
 */

// ── Cache key builder ────────────────────────────────────────────────────────

export const CacheKeys = {
  // B0 — admin info, permissions (15s TTL)
  admin: (id: string) => `admins:admin:${id}`,
  adminPermissions: (id: string) => `admins:permissions:${id}`,

  // B1 — order lists, stats (30s TTL)
  orderList: (adminId: string, filtersHash: string) => `orders:list:${adminId}:${filtersHash}`,
  orderStats: (adminId: string, dateRange: string) => `orders:stats:${adminId}:${dateRange}`,
  customerList: (adminId: string, filtersHash: string) => `customers:list:${adminId}:${filtersHash}`,
  courierList: (adminId: string) => `couriers:list:${adminId}`,

  // B2 — audit logs, messages (60s TTL)
  dashboardView: (adminId: string, sections: string) => `dashboard:view:${adminId}:${sections}`,
  chatConversations: (userId: string) => `chat:conversations:${userId}`,

  // B3 — reports, exports (300s TTL)
  adminBalances: (adminId: string) => `finance:balances:${adminId}`,
}

// ── TTL buckets ──────────────────────────────────────────────────────────────

export const CacheTTL = {
  B0: 15_000,  // 15 seconds — admin info, permissions
  B1: 30_000,  // 30 seconds — order lists, stats
  B2: 60_000,  // 60 seconds — audit logs, messages, dashboard views
  B3: 300_000, // 5 minutes  — reports, exports, financial balances
}
