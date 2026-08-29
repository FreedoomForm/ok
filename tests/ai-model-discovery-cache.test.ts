import assert from 'node:assert/strict'
import test, { afterEach, beforeEach, mock } from 'node:test'
import {
  discoverGeminiModelWithCache,
  resetGeminiModelDiscoveryCache,
  getGeminiModelDiscoveryCacheSize,
} from '../src/lib/ai/config'

const catalogResponse = {
  models: [
    { name: 'models/gemini-pro-legacy', supportedGenerationMethods: ['generateMessage'] },
    { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
  ],
}

function jsonFetch(body: unknown, ok = true) {
  return (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }))() as unknown as ReturnType<typeof fetch>
}

beforeEach(() => {
  resetGeminiModelDiscoveryCache()
})

afterEach(() => {
  mock.restoreAll()
})

test('caches a successful discovery so repeated calls reuse one network fetch', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', () => jsonFetch(catalogResponse))
  const first = await discoverGeminiModelWithCache('key-a')
  const second = await discoverGeminiModelWithCache('key-a')
  assert.equal(first, 'gemini-flash-latest')
  assert.equal(second, 'gemini-flash-latest')
  assert.equal(fetchMock.mock.callCount(), 1)
  assert.equal(getGeminiModelDiscoveryCacheSize(), 1)
})

test('keys the cache per api key and configured model preference', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', () => jsonFetch(catalogResponse))
  await discoverGeminiModelWithCache('key-a')
  await discoverGeminiModelWithCache('key-a', 'gemini-flash-latest')
  await discoverGeminiModelWithCache('key-b')
  assert.equal(fetchMock.mock.callCount(), 3)
  assert.equal(getGeminiModelDiscoveryCacheSize(), 3)
})

test('does not cache failed discoveries so transient provider outages recover', async () => {
  const failing = mock.method(globalThis, 'fetch', () => jsonFetch({}, false))
  assert.equal(await discoverGeminiModelWithCache('key-a'), null)
  assert.equal(await discoverGeminiModelWithCache('key-a'), null)
  assert.equal(failing.mock.callCount(), 2)
  assert.equal(getGeminiModelDiscoveryCacheSize(), 0)
  const succeeding = mock.method(globalThis, 'fetch', () => jsonFetch(catalogResponse))
  assert.equal(await discoverGeminiModelWithCache('key-a'), 'gemini-flash-latest')
  assert.equal(succeeding.mock.callCount(), 1)
})

test('does not cache discoveries rejected by the provider timeout', async () => {
  const failing = mock.method(globalThis, 'fetch', () => Promise.reject(new Error('aborted')))
  assert.equal(await discoverGeminiModelWithCache('key-a'), null)
  assert.equal(failing.mock.callCount(), 1)
  assert.equal(getGeminiModelDiscoveryCacheSize(), 0)
})

test('expires cached discoveries after the ttl and refetches', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', () => jsonFetch(catalogResponse))
  await discoverGeminiModelWithCache('key-a')
  await discoverGeminiModelWithCache('key-a')
  assert.equal(fetchMock.mock.callCount(), 1)
  const shiftedNow = () => Date.now() + 11 * 60_000
  await discoverGeminiModelWithCache('key-a', undefined, shiftedNow)
  assert.equal(fetchMock.mock.callCount(), 2)
})
