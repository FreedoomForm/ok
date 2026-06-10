import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract a human-readable error message from an API response payload.
 *
 * Supports both:
 * - New format: `{ error: { code, message } }` (from createApiRoute)
 * - Legacy format: `{ error: "string" }`
 */
export function extractApiError(payload: unknown, fallback = 'An error occurred'): string {
  if (!payload || typeof payload !== 'object') return fallback

  const err = (payload as Record<string, unknown>).error
  if (!err) return fallback

  // New format: { error: { code, message } }
  if (typeof err === 'object' && err !== null) {
    const msg = (err as Record<string, unknown>).message
    if (typeof msg === 'string' && msg.length > 0) return msg
    // Fallback to code if no message
    const code = (err as Record<string, unknown>).code
    if (typeof code === 'string' && code.length > 0) return code
  }

  // Legacy format: { error: "string" }
  if (typeof err === 'string' && err.length > 0) return err

  return fallback
}

/**
 * Extract the data payload from an API response.
 *
 * Supports both:
 * - New format: `{ data: ... }` (from createApiRoute)
 * - Legacy format: raw payload
 */
export function extractApiData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null

  const data = (payload as Record<string, unknown>).data
  if (data !== undefined) return data as T

  // Legacy format — the payload IS the data
  return payload as T
}
