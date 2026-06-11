import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchApi } from '@/lib/api-client'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonOk(data: unknown, status = 200) {
  return {
    ok: true,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  } as unknown as Response
}

function jsonError(errorBody: unknown, status = 400) {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(errorBody),
  } as unknown as Response
}

describe('fetchApi — error normalization', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns string error from legacy { error: "string" } format', async () => {
    mockFetch.mockResolvedValueOnce(jsonError({ error: 'Not found' }, 404))
    const result = await fetchApi('/api/test')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(typeof result.error).toBe('string')
      expect(result.error).toBe('Not found')
    }
  })

  it('returns string error from new { error: { code, message } } format', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email' } }, 400)
    )
    const result = await fetchApi('/api/test')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(typeof result.error).toBe('string')
      expect(result.error).toBe('Invalid email')
    }
  })

  it('extracts code when message is absent in new format', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ error: { code: 'FORBIDDEN' } }, 403)
    )
    const result = await fetchApi('/api/test')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(typeof result.error).toBe('string')
      expect(result.error).toBe('FORBIDDEN')
    }
  })

  it('returns fallback when error object has neither code nor message', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonError({ error: {} }, 500)
    )
    const result = await fetchApi('/api/test')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(typeof result.error).toBe('string')
      // Should fall back to "Request failed (500)" since the error object has no usable fields
      expect(result.error).toContain('Request failed')
    }
  })

  it('never returns an object as error — always string', async () => {
    const errorBodies = [
      { error: { code: 'ERR', message: 'msg' } },
      { error: { code: 'X', message: '', details: 'extra' } },
      { error: 'simple string' },
      { error: null },
      { message: 'top-level message' },
      {},
    ]

    for (const body of errorBodies) {
      mockFetch.mockResolvedValueOnce(jsonError(body, 400))
      const result = await fetchApi('/api/test')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(typeof result.error).toBe('string')
        expect(result.error).not.toBe('[object Object]')
      }
    }
  })

  it('returns network error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))
    const result = await fetchApi('/api/test')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(typeof result.error).toBe('string')
    }
  })

  it('passes through successful data', async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ id: 1, name: 'test' }))
    const result = await fetchApi<{ id: number; name: string }>('/api/test')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ id: 1, name: 'test' })
    }
  })
})
