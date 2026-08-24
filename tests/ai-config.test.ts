import assert from 'node:assert/strict'
import test from 'node:test'
import { getGeminiConfiguration, resolveGeminiModelName } from '../src/lib/ai/config'

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

test('resolves only catalog models that support generateContent', () => {
  const models = [
    { name: 'models/gemini-3.1-pro-preview', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/embedding-only', supportedGenerationMethods: ['embedContent'] },
    { name: 'models/gemini-3-flash-preview', supportedGenerationMethods: ['generateContent'] },
  ]
  assert.equal(resolveGeminiModelName(models, 'gemini-3.1-pro-preview'), 'gemini-3.1-pro-preview')
  assert.equal(resolveGeminiModelName(models, 'unsupported-model'), 'gemini-3-flash-preview')
  assert.equal(resolveGeminiModelName([{ name: 'models/embedding-only', supportedGenerationMethods: ['embedContent'] }]), null)
})
