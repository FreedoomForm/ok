/**
 * Request ID generation for tracing requests across logs.
 *
 * Uses crypto.randomUUID() for unique, collision-resistant IDs.
 */

export function generateRequestId(): string {
  return crypto.randomUUID()
}
