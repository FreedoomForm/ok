// Structured logging — Backend Design System v1.0 §19
// JSON logs for observability. Safe for Vercel Edge + Node.

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  dbQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
  userId?: string;
  errorCode?: string;
  message: string;
  [key: string]: unknown;
}

export function log(entry: LogEntry): void {
  const clean = { ...entry };
  // Never log secrets
  delete (clean as any).password;
  delete (clean as any).token;
  delete (clean as any).secret;
  delete (clean as any).access_token;
  delete (clean as any).refresh_token;
  console.log(JSON.stringify(clean));
}

export function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}
