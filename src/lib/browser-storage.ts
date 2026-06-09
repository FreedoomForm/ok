export function getJsonFromLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}