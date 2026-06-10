/**
 * Batch DTOs — Shared data transfer objects for batch operations.
 *
 * Per the Backend Design System (Section 15 — Batching):
 * - Max 100 IDs per batch request
 * - Returns found items + list of not-found IDs
 */

export interface BatchGetInput {
  ids: string[] // Max 100 IDs
}

export interface BatchGetResult<T> {
  items: T[]
  notFound: string[] // IDs that weren't found
}
