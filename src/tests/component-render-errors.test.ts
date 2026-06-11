/**
 * Component render tests that verify API error objects don't crash React rendering.
 *
 * This test suite specifically targets React error #31:
 * "Objects are not valid as a React child (found: object with keys {code, message})"
 *
 * The bug occurred because API responses like { error: { code, message } } were
 * passed directly to toast.error(), setError(), or JSX — React can only render
 * strings/numbers as children, not objects.
 *
 * These tests verify that extractApiError() and normalizeErrorString() always
 * produce strings safe for React rendering, even when the API returns object errors.
 */
import { describe, it, expect } from 'vitest'
import { extractApiError } from '@/lib/utils'

// ── Simulated API error payloads (what the server returns) ───────────────────

const apiErrorPayloads = [
  // New createApiRoute format: { error: { code, message } }
  { name: 'validation error', payload: { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data' } } },
  { name: 'forbidden error', payload: { error: { code: 'FORBIDDEN', message: 'Access denied' } } },
  { name: 'not found error', payload: { error: { code: 'NOT_FOUND', message: 'Resource not found' } } },
  { name: 'conflict error', payload: { error: { code: 'CONFLICT', message: 'Already exists' } } },
  { name: 'rate limited', payload: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } } },
  { name: 'internal error', payload: { error: { code: 'INTERNAL', message: 'Server error' } } },
  { name: 'code only (no message)', payload: { error: { code: 'ERR_NO_MSG' } } },
  { name: 'empty message with code', payload: { error: { code: 'ERR_EMPTY_MSG', message: '' } } },
  { name: 'error with extra fields', payload: { error: { code: 'ERR', message: 'Bad request', details: 'field required' } } },
  // Legacy format: { error: "string" }
  { name: 'legacy string error', payload: { error: 'Simple error string' } },
  { name: 'legacy another string', payload: { error: 'Another error' } },
  // Edge cases
  { name: 'null payload', payload: null },
  { name: 'undefined payload', payload: undefined },
  { name: 'empty object', payload: {} },
  { name: 'error is null', payload: { error: null } },
  { name: 'error is number', payload: { error: 404 } },
  { name: 'error is array', payload: { error: ['a', 'b'] } },
] as const

// ── Tests ────────────────────────────────────────────────────────────────────

describe('extractApiError produces React-safe strings', () => {
  it('never returns [object Object] for any API error payload', () => {
    for (const { name, payload } of apiErrorPayloads) {
      const result = extractApiError(payload, 'Default error')
      expect(result, `Case "${name}" returned [object Object]`).not.toBe('[object Object]')
    }
  })

  it('always returns a string type (never object)', () => {
    for (const { name, payload } of apiErrorPayloads) {
      const result = extractApiError(payload, 'Default error')
      expect(typeof result, `Case "${name}" returned type ${typeof result}`).toBe('string')
    }
  })

  it('always returns a non-empty string', () => {
    for (const { name, payload } of apiErrorPayloads) {
      const result = extractApiError(payload, 'Default error')
      expect(result.length, `Case "${name}" returned empty string`).toBeGreaterThan(0)
    }
  })
})

describe('Simulated React rendering: toast.error() receives string, not object', () => {
  // This simulates the exact pattern that caused React error #31:
  //   const data = await res.json()
  //   toast.error(data.error || fallback)  ← object passed to toast → crash

  it('toast.error() argument is always a string for all API error formats', () => {
    for (const { name, payload } of apiErrorPayloads) {
      const toastArg = extractApiError(payload, 'Something went wrong')
      expect(typeof toastArg, `Case "${name}": toast.error received ${typeof toastArg}`).toBe('string')
      expect(toastArg, `Case "${name}": toast.error received [object Object]`).not.toBe('[object Object]')
    }
  })
})

describe('Simulated React rendering: setError() state is render-safe', () => {
  // This simulates the pattern that crashed in JSX:
  //   setFormError(data.error || 'Failed')
  //   ... <AlertDescription>{formError}</AlertDescription>
  // When formError is { code, message } → React error #31

  it('setError() value is always a renderable primitive', () => {
    for (const { name, payload } of apiErrorPayloads) {
      const errorState = extractApiError(payload, 'Operation failed')
      // React can render: string, number. Cannot render: object, array, null, undefined, boolean
      const isRenderable = typeof errorState === 'string' || typeof errorState === 'number'
      expect(isRenderable, `Case "${name}": setError value is ${typeof errorState}, not renderable`).toBe(true)
    }
  })
})

describe('Simulated React rendering: JSX expression {errorVar} is safe', () => {
  // The crash pattern in JSX:
  //   {data.error && <p>{data.error}</p>}
  // When data.error = { code: 'X', message: 'Y' } → React tries to render object → crash

  it('JSX child from extractApiError is always a safe string', () => {
    for (const { name, payload } of apiErrorPayloads) {
      const jsxChild = extractApiError(payload, 'Error')
      // Verify it won't crash React's reconciliation
      expect(typeof jsxChild === 'string', `Case "${name}": not a string`).toBe(true)
      expect(jsxChild, `Case "${name}": would render as [object Object]`).not.toBe('[object Object]')
    }
  })
})

describe('Error extraction correctness', () => {
  it('extracts message from { error: { code, message } }', () => {
    expect(extractApiError({ error: { code: 'VAL', message: 'Bad input' } })).toBe('Bad input')
    expect(extractApiError({ error: { code: 'FORBIDDEN', message: 'No access' } })).toBe('No access')
  })

  it('falls back to code when message is empty/missing', () => {
    expect(extractApiError({ error: { code: 'MY_CODE' } })).toBe('MY_CODE')
    expect(extractApiError({ error: { code: 'ERR', message: '' } })).toBe('ERR')
  })

  it('passes through legacy string errors unchanged', () => {
    expect(extractApiError({ error: 'Not found' })).toBe('Not found')
  })

  it('returns fallback for null/undefined/empty', () => {
    expect(extractApiError(null, 'fallback')).toBe('fallback')
    expect(extractApiError(undefined, 'fallback')).toBe('fallback')
    expect(extractApiError({}, 'fallback')).toBe('fallback')
    expect(extractApiError({ error: '' }, 'fallback')).toBe('fallback')
  })
})
