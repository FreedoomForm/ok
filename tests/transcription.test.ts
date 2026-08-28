import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_AUDIO_BYTES, isSupportedAudioUpload, normalizeAudioMimeType, normalizeTranscript } from '../src/lib/ai/transcription'

test('audio upload validation accepts bounded supported formats only', () => {
  assert.equal(isSupportedAudioUpload(1024, 'audio/webm'), true)
  assert.equal(isSupportedAudioUpload(1024, 'Audio/WebM;codecs=opus'), true)
  assert.equal(normalizeAudioMimeType('Audio/WebM;codecs=opus'), 'audio/webm')
  assert.equal(isSupportedAudioUpload(MAX_AUDIO_BYTES, 'audio/wav'), true)
  assert.equal(isSupportedAudioUpload(MAX_AUDIO_BYTES + 1, 'audio/webm'), false)
  assert.equal(isSupportedAudioUpload(1024, 'application/octet-stream'), false)
  assert.equal(isSupportedAudioUpload(0, 'audio/webm'), false)
})

test('transcript normalization trims and bounds provider output', () => {
  assert.equal(normalizeTranscript('  buy tomatoes  '), 'buy tomatoes')
  assert.equal(normalizeTranscript('x'.repeat(5001)).length, 5000)
})
