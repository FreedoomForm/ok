/**
 * Cacheable — Cache wrapper for repository/query functions.
 *
 * Provides a simple API to wrap any async function with caching:
 * - `cacheable()` — checks cache first, calls fn on miss, stores result
 * - `invalidateCache()` — removes cached entries by prefix
 */

import { appCache } from './cache'

/**
 * Execute a function with caching.
 *
 * If the cache has a fresh value for the given key, returns it immediately.
 * Otherwise, calls `fn`, stores the result in cache with the given TTL,
 * and returns it.
 *
 * @param fn - The async function to execute on cache miss
 * @param key - Cache key (use CacheKeys builder for consistency)
 * @param ttlMs - Time-to-live in milliseconds (use CacheTTL constants)
 * @returns The cached or freshly computed value
 */
export async function cacheable<T>(
  fn: () => Promise<T>,
  key: string,
  ttlMs: number,
): Promise<T> {
  const cached = appCache.get<T>(key)
  if (cached !== undefined) {
    return cached
  }

  const value = await fn()
  appCache.set(key, value, ttlMs)
  return value
}

/**
 * Invalidate cached entries by prefix.
 *
 * Use this in commands that modify data to clear all related cache entries.
 * For example, after creating an order, call `invalidateCache('orders:')`
 * to clear all order-related caches.
 *
 * @param prefix - Cache key prefix to invalidate
 */
export function invalidateCache(prefix: string): void {
  appCache.deleteByPrefix(prefix)
}

/**
 * Invalidate multiple cache prefixes at once.
 *
 * Convenience function for commands that affect multiple domains.
 * For example, creating an order affects orders, stats, and dashboard cache.
 *
 * @param prefixes - Array of cache key prefixes to invalidate
 */
export function invalidateCacheMultiple(prefixes: string[]): void {
  for (const prefix of prefixes) {
    appCache.deleteByPrefix(prefix)
  }
}
