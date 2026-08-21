export type GeminiEnvironment = {
  GEMINI_API_KEY?: string
  [key: string]: string | undefined
}

export type GeminiConfiguration = {
  apiKey: string | null
  mode: 'gemini' | 'deterministic-fallback'
}

export function getGeminiConfiguration(env: GeminiEnvironment = process.env): GeminiConfiguration {
  const apiKey = env.GEMINI_API_KEY?.trim() || null
  return {
    apiKey,
    mode: apiKey ? 'gemini' : 'deterministic-fallback',
  }
}
