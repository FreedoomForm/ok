// Shared cache interface — Backend Design System v1.0 §14
// Abstracts Redis / in-memory / Vercel KV.
//
// Production: Upstash Redis (persistent across serverless cold starts)
// Dev fallback: InMemoryCache (no Redis needed)

import { getRedis } from '@/lib/redis'

export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// ── Redis Cache Adapter ───────────────────────────────────────────────────

export class RedisCache implements CacheStore {
  private redis: NonNullable<ReturnType<typeof getRedis>>

  constructor(redis: NonNullable<ReturnType<typeof getRedis>>) {
    this.redis = redis
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<T>(key)
    return value ?? null
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    if (ttlSeconds <= 0) {
      await this.redis.set(key, JSON.stringify(value))
    } else {
      await this.redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }
}

// ── In-Memory Cache (dev fallback) ────────────────────────────────────────

const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

export class InMemoryCache implements CacheStore {
  async get<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    memoryCache.delete(key);
  }
}

// ── Default cache instance ────────────────────────────────────────────────
// Uses Redis when UPSTASH_REDIS_REST_URL is set, falls back to in-memory.

function createDefaultCache(): CacheStore {
  const redis = getRedis()
  if (redis) {
    return new RedisCache(redis)
  }
  return new InMemoryCache()
}

export const defaultCache: CacheStore = createDefaultCache()

/**
 * Create a namespaced cache instance.
 * Prefixes all keys with `namespace:` to avoid collisions.
 */
export function createNamespacedCache(namespace: string, ttlSeconds = 60): CacheStore {
  const base = createDefaultCache()
  return {
    async get<T>(key: string): Promise<T | null> {
      return base.get<T>(`${namespace}:${key}`)
    },
    async set<T>(key: string, value: T, customTtl?: number): Promise<void> {
      await base.set(`${namespace}:${key}`, value, customTtl ?? ttlSeconds)
    },
    async delete(key: string): Promise<void> {
      await base.delete(`${namespace}:${key}`)
    },
  }
}
