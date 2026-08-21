export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
].join('; ')

export function applySecurityHeaders(headers: Headers, isProduction: boolean, reportUri?: string): void {
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('X-DNS-Prefetch-Control', 'off')

  if (!isProduction) return

  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  headers.set(
    'Content-Security-Policy-Report-Only',
    reportUri ? `${CONTENT_SECURITY_POLICY_REPORT_ONLY}; report-uri ${reportUri}` : CONTENT_SECURITY_POLICY_REPORT_ONLY,
  )
}
