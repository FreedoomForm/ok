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
<<<<<<< HEAD
  },
=======
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
    const status = entry.status as number;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `${entry.method} ${entry.route} → ${status}`, {
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
>>>>>>> 9832d9b (test: senior-grade test suite for API error contract + fix all TS errors)
}

export { generateRequestId } from './request-id'
