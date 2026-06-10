/**
 * Structured JSON logger with request ID support.
 *
 * Phase 1: Simple console-based structured logging.
 * Phase 2 (later): Integration with external logging service.
 */

export interface LogContext {
  requestId?: string
  userId?: string
  route?: string
  method?: string
  [key: string]: unknown
}

function formatLog(level: string, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }
  return JSON.stringify(entry)
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(formatLog('info', message, context))
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context))
  },

  error(message: string, context?: LogContext) {
    console.error(formatLog('error', message, context))
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('debug', message, context))
    }
  },
}
