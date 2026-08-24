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
