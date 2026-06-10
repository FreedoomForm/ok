/**
 * Get Customer Order Tracking Query — Application layer.
 *
 * Customer-facing use case: an authenticated customer fetches one of *their own*
 * orders for tracking (status + assigned courier live location).
 *
 * Ownership is enforced inside the repository query (`customerId` filter), so a
 * customer can never read another customer's order. A missing/foreign order
 * yields `null`, which the route maps to 404 (avoids leaking order existence).
 */

import {
  getCustomerOrderTracking,
  type GetCustomerOrderTrackingInput,
} from '../../infrastructure/order.repository'
import type { CustomerOrderTracking } from '../../contracts'

export interface GetCustomerOrderTrackingQuery {
  /** Authenticated customer id (from the customer session, never from input). */
  customerId: string
  orderId: string
}

export async function executeGetCustomerOrderTracking(
  query: GetCustomerOrderTrackingQuery,
): Promise<CustomerOrderTracking | null> {
  const input: GetCustomerOrderTrackingInput = {
    orderId: query.orderId,
    customerId: query.customerId,
  }
  return getCustomerOrderTracking(input)
}
