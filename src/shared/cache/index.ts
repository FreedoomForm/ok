// Shared cache interface — Backend Design System v1.0 §14
// Abstracts Redis / in-memory / Vercel KV.

export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// In-memory fallback for local dev / serverless cold starts
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

export const defaultCache: CacheStore = new InMemoryCache();
