/**
 * Get Customer Profile Query — Application layer.
 *
 * Returns the authenticated customer's profile data.
 */

import { UnauthorizedError, NotFoundError } from '@/modules/shared/errors'
import { findCustomerProfile } from '../../infrastructure/sites.repository'
import type { CustomerProfileDTO } from '../../contracts'

export interface GetCustomerProfileQuery {
  customerId: string
}

/**
 * Execute the Get Customer Profile query.
 */
export async function executeGetCustomerProfile(
  query: GetCustomerProfileQuery,
): Promise<CustomerProfileDTO> {
  if (!query.customerId) {
    throw new UnauthorizedError()
  }

  const profile = await findCustomerProfile(query.customerId)
  if (!profile) {
    throw new NotFoundError('Customer')
  }
  return profile
}
