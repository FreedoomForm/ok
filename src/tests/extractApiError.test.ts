import { describe, it, expect } from 'vitest'
import { extractApiError, extractApiData } from '@/lib/utils'

describe('extractApiError', () => {
  // ── New format: { error: { code, message } } ──────────────────────
  describe('new format { error: { code, message } }', () => {
    it('extracts message from { error: { code, message } }', () => {
      const payload = { error: { code: 'VALIDATION_ERROR', message: 'Invalid email' } }
      expect(extractApiError(payload)).toBe('Invalid email')
    })

    it('falls back to code when message is empty', () => {
      const payload = { error: { code: 'UNKNOWN', message: '' } }
      expect(extractApiError(payload)).toBe('UNKNOWN')
    })

    it('falls back to code when message is missing', () => {
      const payload = { error: { code: 'FORBIDDEN' } }
      expect(extractApiError(payload)).toBe('FORBIDDEN')
    })

    it('falls back to default when both code and message are empty', () => {
      const payload = { error: { code: '', message: '' } }
      expect(extractApiError(payload, 'fallback')).toBe('fallback')
    })

    it('handles error object with extra fields', () => {
      const payload = { error: { code: 'ERR', message: 'Bad request', details: 'field X is required' } }
      expect(extractApiError(payload)).toBe('Bad request')
    })
  })

  // ── Legacy format: { error: "string" } ─────────────────────────────
  describe('legacy format { error: "string" }', () => {
    it('returns the string directly', () => {
      expect(extractApiError({ error: 'Not found' })).toBe('Not found')
    })

    it('returns fallback when error is empty string', () => {
      expect(extractApiError({ error: '' }, 'fallback')).toBe('fallback')
    })
  })

  // ── Edge cases ──────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns fallback for null payload', () => {
      expect(extractApiError(null, 'fallback')).toBe('fallback')
    })

    it('returns fallback for undefined payload', () => {
      expect(extractApiError(undefined, 'fallback')).toBe('fallback')
    })

    it('returns fallback for non-object payload', () => {
      expect(extractApiError('string', 'fallback')).toBe('fallback')
    })

    it('returns fallback when error field is missing', () => {
      expect(extractApiError({ data: 'something' }, 'fallback')).toBe('fallback')
    })

    it('returns fallback when error is a number', () => {
      expect(extractApiError({ error: 404 }, 'fallback')).toBe('fallback')
    })

    it('returns fallback when error is an array', () => {
      expect(extractApiError({ error: ['a', 'b'] }, 'fallback')).toBe('fallback')
    })

    it('default fallback is "An error occurred"', () => {
      expect(extractApiError(null)).toBe('An error occurred')
    })

    it('handles nested error.message being a number', () => {
      const payload = { error: { code: 'ERR', message: 123 } }
      expect(extractApiError(payload, 'fallback')).toBe('ERR')
    })

    it('handles { error: null }', () => {
      expect(extractApiError({ error: null }, 'fallback')).toBe('fallback')
    })
  })
})

describe('extractApiData', () => {
  it('extracts data field from new format', () => {
    const payload = { data: { id: 1, name: 'test' } }
    expect(extractApiData(payload)).toEqual({ id: 1, name: 'test' })
  })

  it('returns entire payload as data when no data field (legacy)', () => {
    const payload = { id: 1, name: 'test' }
    expect(extractApiData(payload)).toEqual(payload)
  })

  it('returns null for null payload', () => {
    expect(extractApiData(null)).toBeNull()
  })
})
