import { GoogleGenerativeAI } from '@google/generative-ai'

export type GeminiEnvironment = {
  GEMINI_API_KEY?: string
  [key: string]: string | undefined
}

export type GeminiConfiguration = {
  apiKey: string | null
  mode: 'gemini' | 'deterministic-fallback'
}

export type GeminiCatalogModel = {
  name?: string
  supportedGenerationMethods?: string[]
}

export function resolveGeminiModelName(models: GeminiCatalogModel[], configured?: string): string | null {
  const usable = models
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => model.name?.replace(/^models\//, '').trim())
    .filter((name): name is string => Boolean(name))
  if (configured?.trim() && usable.includes(configured.trim().replace(/^models\//, ''))) return configured.trim().replace(/^models\//, '')
  const preferred = usable.find((name) => /flash/i.test(name))
  return preferred ?? usable[0] ?? null
}

export async function discoverGeminiModel(apiKey: string, configured?: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) return null
    const payload = await response.json() as { models?: GeminiCatalogModel[] }
    return resolveGeminiModelName(Array.isArray(payload.models) ? payload.models : [], configured)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const MODEL_DISCOVERY_TTL_MS = 10 * 60_000
const modelDiscoveryCache = new Map<string, { model: string | null; expiresAt: number }>()

/**
 * Capability-verified model discovery with a short-lived positive cache so the
 * assistant endpoint does not repeat the provider catalog fetch on every
 * request (verification-matrix performance row). Only successful discoveries
 * are cached: failed or timed-out provider calls stay uncached so transient
 * outages recover on the next request. The cache is keyed per api key and
 * configured model preference.
 */
export async function discoverGeminiModelWithCache(apiKey: string, configured?: string, now: () => number = Date.now): Promise<string | null> {
  const cacheKey = `${configured?.trim() ?? ''}:${apiKey}`
  const cached = modelDiscoveryCache.get(cacheKey)
  if (cached && cached.expiresAt > now()) return cached.model
  const model = await discoverGeminiModel(apiKey, configured)
  if (model) {
    modelDiscoveryCache.set(cacheKey, { model, expiresAt: now() + MODEL_DISCOVERY_TTL_MS })
  }
  return model
}

export function resetGeminiModelDiscoveryCache(): void {
  modelDiscoveryCache.clear()
}

export function getGeminiModelDiscoveryCacheSize(): number {
  return modelDiscoveryCache.size
}

export function getGeminiConfiguration(env: GeminiEnvironment = process.env): GeminiConfiguration {
  const apiKey = env.GEMINI_API_KEY?.trim() || null
  return {
    apiKey,
    mode: apiKey ? 'gemini' : 'deterministic-fallback',
  }
}

export function createGeminiClient(env: GeminiEnvironment = process.env): GoogleGenerativeAI | null {
  const configuration = getGeminiConfiguration(env)
  return configuration.apiKey ? new GoogleGenerativeAI(configuration.apiKey) : null
}
