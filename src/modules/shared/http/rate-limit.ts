/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter with TTL-based cleanup.
 * Keys are composed of IP + userId for authenticated requests.
 *
 * Presets:
 * - Auth endpoints: 10 req/min
 * - Read endpoints: 120 req/min
 * - Write endpoints: 60 req/min
 */

// ── Types ───────────────────────────────────────────────────────────────────

type Bucket = {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
  /** Remaining requests in the current window */
  remaining: number
}

export type RateLimitPreset = 'auth' | 'read' | 'write'

// ── Configuration ───────────────────────────────────────────────────────────

const PRESETS: Record<RateLimitPreset, { limit: number; windowMs: number }> = {
  auth: { limit: 10, windowMs: 60_000 },    // 10 req/min
  read: { limit: 120, windowMs: 60_000 },   // 120 req/min
  write: { limit: 60, windowMs: 60_000 },   // 60 req/min
}

// ── State ───────────────────────────────────────────────────────────────────

const buckets = new Map<string, Bucket>()

// Periodic cleanup: remove expired buckets every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) {
        buckets.delete(key)
      }
    }
  }, 60_000)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip') || 'unknown'
}

function buildKey(ip: string, userId?: string, prefix?: string): string {
  const parts = [prefix ?? 'rl', ip]
  if (userId) parts.push(userId)
  return parts.join(':')
}

// ── Core function ───────────────────────────────────────────────────────────

/**
 * Check rate limit for a request.
 *
 * @param key - The rate limit key (IP + userId based)
 * @param limit - Maximum number of requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { allowed: true, retryAfterSec: 0, remaining: limit - existing.count }
}

// ── Preset-based rate limiting ──────────────────────────────────────────────

/**
 * Check rate limit using a preset.
 *
 * Automatically builds the key from IP + optional userId.
 *
 * @example
 * ```ts
 * const result = checkRateLimitPreset(request, 'auth', user?.id)
 * if (!result.allowed) {
 *   throw new RateLimitError(result.retryAfterSec)
 * }
 * ```
 */
export function checkRateLimitPreset(
  request: { headers: Headers },
  preset: RateLimitPreset,
  userId?: string,
): RateLimitResult {
  const config = PRESETS[preset]
  const ip = getClientIp(request.headers)
  const key = buildKey(ip, userId, preset)
  return checkRateLimit(key, config.limit, config.windowMs)
}

/**
 * Get client IP from request headers.
 */
export { getClientIp }
