export function getPublicErrorMessage(error: unknown, fallback: string): string {
  return process.env.NODE_ENV === 'production' || !(error instanceof Error) ? fallback : error.message
}
