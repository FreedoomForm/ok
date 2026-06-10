/**
 * Cache module — Application-level in-memory caching.
 *
 * Provides:
 * - `appCache` — Singleton cache instance with TTL and prefix-based invalidation
 * - `CacheKeys` — Typed cache key builder following {module}:{resource}:{id}:{scope} format
 * - `CacheTTL` — TTL bucket constants (B0=15s, B1=30s, B2=60s, B3=300s)
 * - `cacheable()` — Wrap async functions with caching
 * - `invalidateCache()` — Remove cached entries by prefix
 * - `invalidateCacheMultiple()` — Remove cached entries by multiple prefixes
 */

export { appCache } from './cache'
export { CacheKeys, CacheTTL } from './cache-keys'
export { cacheable, invalidateCache, invalidateCacheMultiple } from './cacheable'
