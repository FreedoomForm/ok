import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTrustedMapUrl } from '../src/lib/safe-url'

test('accepts supported Google Maps URL hosts without credentials or ports', () => {
  assert.equal(parseTrustedMapUrl('https://maps.app.goo.gl/example')?.hostname, 'maps.app.goo.gl')
  assert.equal(parseTrustedMapUrl('https://www.google.com/maps/search/?api=1')?.hostname, 'www.google.com')
})

test('rejects untrusted, non-HTTPS, credentialed, and port-bearing URLs', () => {
  assert.equal(parseTrustedMapUrl('http://maps.google.com/maps'), null)
  assert.equal(parseTrustedMapUrl('https://127.0.0.1/internal'), null)
  assert.equal(parseTrustedMapUrl('https://user:pass@maps.google.com/maps'), null)
  assert.equal(parseTrustedMapUrl('https://maps.google.com:8443/maps'), null)
  assert.equal(parseTrustedMapUrl('https://evil.example.test/maps'), null)
})
