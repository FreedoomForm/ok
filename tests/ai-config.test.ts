import assert from 'node:assert/strict'
import test from 'node:test'
import { getGeminiConfiguration } from '../src/lib/ai/config'

test('selects deterministic fallback when Gemini is not configured', () => {
  assert.deepEqual(getGeminiConfiguration({}), {
    apiKey: null,
    mode: 'deterministic-fallback',
  })
  assert.deepEqual(getGeminiConfiguration({ GEMINI_API_KEY: '   ' }), {
    apiKey: null,
    mode: 'deterministic-fallback',
  })
})

test('selects Gemini mode only for a non-empty configured key', () => {
  assert.deepEqual(getGeminiConfiguration({ GEMINI_API_KEY: '  test-key  ' }), {
    apiKey: 'test-key',
    mode: 'gemini',
  })
})
