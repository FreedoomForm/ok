type OtpPurpose = 'login' | 'register'

type OtpRecord = {
  code: string
  purpose: OtpPurpose
  expiresAt: number
  attemptsLeft: number
  createdAt: number
}

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_ATTEMPTS = 5
const OTP_RESEND_COOLDOWN_MS = 45 * 1000

const otpStore = new Map<string, OtpRecord>()

function buildKey(subdomain: string, phone: string) {
  return `${subdomain}:${phone}`
}

function purgeExpired(key: string) {
  const record = otpStore.get(key)
  if (!record) return
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key)
  }
}

export function canSendOtp(subdomain: string, phone: string) {
  const key = buildKey(subdomain, phone)
  purgeExpired(key)
  const existing = otpStore.get(key)
  if (!existing) return { allowed: true as const }

  const elapsed = Date.now() - existing.createdAt
  if (elapsed >= OTP_RESEND_COOLDOWN_MS) {
    return { allowed: true as const }
  }

  return {
    allowed: false as const,
    retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed,
  }
}

export function issueOtp(subdomain: string, phone: string, purpose: OtpPurpose) {
  const key = buildKey(subdomain, phone)
  const code = String(Math.floor(100000 + Math.random() * 900000))

  const record: OtpRecord = {
    code,
    purpose,
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsLeft: OTP_ATTEMPTS,
    createdAt: Date.now(),
  }

  otpStore.set(key, record)

  return {
    code,
    expiresInSec: Math.floor(OTP_TTL_MS / 1000),
  }
}

export function verifyOtp(subdomain: string, phone: string, purpose: OtpPurpose, code: string) {
  const key = buildKey(subdomain, phone)
  purgeExpired(key)

  const record = otpStore.get(key)
  if (!record) {
    return { ok: false as const, error: 'OTP_EXPIRED_OR_MISSING' }
  }

  if (record.purpose !== purpose) {
    return { ok: false as const, error: 'OTP_PURPOSE_MISMATCH' }
  }

  if (record.code !== code) {
    record.attemptsLeft -= 1
    if (record.attemptsLeft <= 0) {
      otpStore.delete(key)
      return { ok: false as const, error: 'OTP_ATTEMPTS_EXCEEDED' }
    }
    otpStore.set(key, record)
    return { ok: false as const, error: 'OTP_INVALID', attemptsLeft: record.attemptsLeft }
  }

  otpStore.delete(key)
  return { ok: true as const }
}
