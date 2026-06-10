/**
 * Application-level in-memory cache.
 *
 * Simple Map-based cache with TTL support and prefix-based invalidation.
 * Designed for single-instance deployments (Vercel serverless / single container).
 *
 * The cleanup timer uses `unref()` to avoid preventing Node.js from exiting.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number // Unix timestamp in ms
}

class AppCache {
  private store = new Map<string, CacheEntry<any>>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000)
    // Don't prevent process exit
    if (this.cleanupInterval.unref) this.cleanupInterval.unref()
  }

  /**
   * Get a cached value by key.
   * Returns undefined if the key doesn't exist or has expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return entry.value as T
  }

  /**
   * Set a cached value with a TTL.
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Delete a specific cache key.
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Delete all keys matching a prefix.
   * Used for group invalidation (e.g., invalidate all order-related cache).
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Remove all expired entries.
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }
}

/** Singleton cache instance — shared across the application. */
export const appCache = new AppCache()
