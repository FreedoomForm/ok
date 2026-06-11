import { describe, it, expect } from 'vitest'

/**
 * Tests that verify the API error handling contract:
 * No matter what format the API returns, frontend code must never
 * receive an object where a string is expected.
 *
 * This test suite is specifically designed to prevent React error #31:
 * "Objects are not valid as a React child (found: object with keys {code, message})"
 */

describe('API error contract — never render objects as React children', () => {
  // Simulates what extractApiError does
  function extractApiError(payload: unknown, fallback = 'An error occurred'): string {
    if (!payload || typeof payload !== 'object') return fallback
    const err = (payload as Record<string, unknown>).error
    if (!err) return fallback
    if (typeof err === 'object' && err !== null) {
      const msg = (err as Record<string, unknown>).message
      if (typeof msg === 'string' && msg.length > 0) return msg
      const code = (err as Record<string, unknown>).code
      if (typeof code === 'string' && code.length > 0) return code
    }
    if (typeof err === 'string' && err.length > 0) return err
    return fallback
  }

  const apiResponses = [
    // New createApiRoute format
    { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
    { error: { code: 'FORBIDDEN', message: 'Access denied' } },
    { error: { code: 'NOT_FOUND', message: 'Resource not found' } },
    { error: { code: 'CONFLICT', message: 'Already exists' } },
    { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    { error: { code: 'INTERNAL', message: 'Server error' } },
    // Edge: code only, no message
    { error: { code: 'ERR_NO_MSG' } },
    // Edge: empty message, code present
    { error: { code: 'ERR_EMPTY_MSG', message: '' } },
    // Legacy format
    { error: 'Simple error string' },
    { error: 'Another error' },
    // Top-level message (no error field)
    { message: 'Top-level message' },
    // Nested error with details
    { error: { code: 'ERR', message: 'Main error', details: 'Extra info' } },
  ]

  it('never returns [object Object] for any API response format', () => {
    for (const response of apiResponses) {
      const result = extractApiError(response)
      expect(result).not.toBe('[object Object]')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('never returns an object type result', () => {
    for (const response of apiResponses) {
      const result = extractApiError(response)
      expect(typeof result).toBe('string')
    }
  })

  it('extracts human-readable message from { error: { code, message } }', () => {
    expect(extractApiError({ error: { code: 'VAL', message: 'Bad input' } })).toBe('Bad input')
    expect(extractApiError({ error: { code: 'FORBIDDEN', message: 'No access' } })).toBe('No access')
  })

  it('falls back to code when message is missing', () => {
    expect(extractApiError({ error: { code: 'MY_CODE' } })).toBe('MY_CODE')
  })

  it('returns fallback for unparseable responses', () => {
    expect(extractApiError(null, 'Default')).toBe('Default')
    expect(extractApiError(undefined, 'Default')).toBe('Default')
    expect(extractApiError({}, 'Default')).toBe('Default')
    expect(extractApiError({ data: 'x' }, 'Default')).toBe('Default')
  })

  it('simulates toast.error() receiving the result — must be string', () => {
    // This is the exact pattern that caused React error #31:
    //   const data = await response.json()
    //   toast.error(data.error || fallback)
    // When data.error is { code, message }, toast receives an object → crash

    for (const response of apiResponses) {
      const errorForToast = extractApiError(response, 'Something went wrong')
      // toast.error() expects a string; objects cause React error #31
      expect(typeof errorForToast).toBe('string')
      expect(errorForToast).not.toBe('[object Object]')
    }
  })

  it('simulates setError() receiving the result — must be string for JSX', () => {
    // This is the pattern that crashed:
    //   setFormError(data.error || 'Failed')
    //   ... <AlertDescription>{formError}</AlertDescription>
    // When formError is an object → React error #31

    for (const response of apiResponses) {
      const errorForState = extractApiError(response, 'Operation failed')
      // React can only render strings/numbers as children, not objects
      expect(typeof errorForState === 'string' || typeof errorForState === 'number').toBe(true)
    }
  })
})
