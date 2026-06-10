/**
 * Customer Logout Command — Application layer.
 *
 * Handles customer logout (cookie clearing is handled at the route level).
 */

import type { CustomerLogoutResult } from '../../contracts'

export type CustomerLogoutCommand = Record<string, never>

/**
 * Execute the Customer Logout command.
 * The actual cookie clearing happens in the route handler since
 * it needs access to the NextResponse object.
 */
export async function executeCustomerLogout(
  _command?: CustomerLogoutCommand,
): Promise<CustomerLogoutResult> {
  return { success: true }
}
