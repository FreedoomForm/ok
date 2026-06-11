// Shared Redis singleton — single Upstash client for rate-limiting + caching
// Prevents duplicate connections to the same Redis instance.

import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

/**
 * Get or create the Upstash Redis client.
 * Returns null when UPSTASH_REDIS_REST_URL is not set (local dev / no Redis).
 */
export function getRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}
