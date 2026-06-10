/**
 * Get Customer Plan Query — Application layer.
 *
 * Returns the customer's plan status (auto-orders enabled/disabled).
 */

import { UnauthorizedError, NotFoundError } from '@/modules/shared/errors'
import { findCustomerPlan } from '../../infrastructure/sites.repository'
import type { CustomerPlanDTO } from '../../contracts'

export interface GetCustomerPlanQuery {
  customerId: string
}

/**
 * Execute the Get Customer Plan query.
 */
export async function executeGetCustomerPlan(
  query: GetCustomerPlanQuery,
): Promise<CustomerPlanDTO> {
  if (!query.customerId) {
    throw new UnauthorizedError()
  }

  const plan = await findCustomerPlan(query.customerId)
  if (!plan) {
    throw new NotFoundError('Customer plan')
  }
  return plan
}
