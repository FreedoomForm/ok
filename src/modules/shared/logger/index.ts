/* ═════════════════════════════════════════════
   Backend Design System v1.0 — Structured Logger
   «Чистая библиотека»

   Каждый request логирует:
   - method, route, status, durationMs, dbQueries, userId, requestId

   Не логировать:
   - password, access token, refresh token, credit card, private keys
   ═════════════════════════════════════════════ */

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface RequestLogEntry extends LogEntry {
  requestId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  dbQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
  userId?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
  'cookie',
  'creditCard',
  'cardNumber',
  'cvv',
  'secret',
]);

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatEntry(entry: LogEntry): string {
  const { level, message, timestamp, ...rest } = entry;
  const sanitized = sanitize(rest as Record<string, unknown>);
  return JSON.stringify({
    level,
    message,
    timestamp,
    ...sanitized,
  });
}

class Logger {
  private context: Record<string, unknown> = {};

  withContext(ctx: Record<string, unknown>): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...ctx };
    return child;
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log('error', message, data);
  }

  request(entry: Omit<RequestLogEntry, 'level' | 'message' | 'timestamp'>) {
    const level = entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info';
    this.log(level, `${entry.method} ${entry.route} → ${entry.status}`, {
      ...entry,
      type: 'request',
    });
  }

  slowQuery(queryName: string, durationMs: number, data?: Record<string, unknown>) {
    this.warn(`Slow query: ${queryName}`, {
      ...data,
      queryName,
      durationMs,
      type: 'slow_query',
    });
  }

  private log(level: LogEntry['level'], message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };

    const formatted = formatEntry(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

export const logger = new Logger();
