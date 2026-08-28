export const MAX_AUDIO_BYTES = 8 * 1024 * 1024

const supportedAudioTypes = new Set(['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4'])

export function normalizeAudioMimeType(mimeType: string): string {
  return mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

export function isSupportedAudioUpload(size: number, mimeType: string): boolean {
  return Number.isInteger(size) && size > 0 && size <= MAX_AUDIO_BYTES && supportedAudioTypes.has(normalizeAudioMimeType(mimeType))
}

export function normalizeTranscript(value: string): string {
  return value.trim().slice(0, 5000)
}
