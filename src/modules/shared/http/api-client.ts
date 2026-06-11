/**
 * Small shared API client used across dashboard modules.
 * It keeps all request and response error handling in one place.
 *
 * @note Frontend consumers should migrate API calls to use the `/api/v1/` prefix
 *       for versioned endpoints. The unversioned `/api/` paths remain available
 *       for backward compatibility but may be deprecated in a future release.
 *       Example: `/api/orders` → `/api/v1/orders`
 */

export type ApiResult<T = unknown> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
      details?: string
      status?: number
    }

type FetchApiOptions<TBody = unknown> = {
  method?: string
  body?: TBody
  headers?: Record<string, string>
  signal?: AbortSignal
}

type ErrorPayload = {
  error?: string
  message?: string
  details?: string
}

const DEFAULT_NETWORK_ERROR = 'Network error while contacting the server'
const DEFAULT_REQUEST_ERROR = 'Request failed'

/**
 * Normalize an error value to a string.
 * API responses may return `{ error: { code, message } }` (createApiRoute)
 * or `{ error: "string" }` (legacy). This ensures we always extract a string.
 */
function normalizeErrorString(err: unknown): string | undefined {
  if (typeof err === 'string' && err.length > 0) return err
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message
    if (typeof obj.code === 'string' && obj.code.length > 0) return obj.code
  }
  return undefined
}

function extractErrorPayload(payload: unknown): ErrorPayload | null {
  if (!payload || typeof payload !== 'object') return null
  return payload as ErrorPayload
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }
  return response.text().catch(() => null)
}

export async function fetchApi<T = unknown, TBody = unknown>(
  url: string,
  options?: FetchApiOptions<TBody>
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers = {}, signal } = options ?? {}

  const canSendBody = method !== 'GET' && method !== 'HEAD'
  const requestHeaders: Record<string, string> = { ...headers }
  if (canSendBody && body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      signal,
      ...(canSendBody && body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    const payload = await parseResponsePayload(response)
    if (response.ok) {
      return { ok: true, data: payload as T }
    }

    const parsedError = extractErrorPayload(payload)
    return {
      ok: false,
      error:
        normalizeErrorString(parsedError?.error) ||
        parsedError?.message ||
        `${DEFAULT_REQUEST_ERROR} (${response.status})`,
      details: parsedError?.details,
      status: response.status,
    }
  } catch {
    return { ok: false, error: DEFAULT_NETWORK_ERROR }
  }
}
