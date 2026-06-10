/**
 * Pay Salary Command — Application layer.
 *
 * Handles salary payment with:
 * - Role-based scoping for staff access
 * - Staff scope validation
 * - Company balance deduction
 */

import { getOwnerAdminId, getGroupAdminIds } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import type { PaySalaryData } from '../../contracts'
import {
  paySalary,
  verifyStaffInScope,
  type PaySalaryInput,
} from '../../infrastructure/finance.repository'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'

export interface PaySalaryCommand {
  user: AuthUser
  data: PaySalaryData
}

/**
 * Execute the Pay Salary command.
 */
export async function executePaySalary(
  command: PaySalaryCommand,
): Promise<{ success: boolean }> {
  const { user, data } = command

  const targetAdminId = data.recipientAdminId ?? data.adminId

  if (!targetAdminId || !data.amount || data.amount <= 0) {
    throw new BadRequestError('Invalid data')
  }

  // Resolve effective admin ID
  const effectiveAdminId =
    user.role === 'LOW_ADMIN'
      ? (await getOwnerAdminId(user)) ?? user.id
      : user.id

  const groupAdminIds = await getGroupAdminIds(user)
  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  // Verify staff is in scope
  const staff = await verifyStaffInScope(targetAdminId, groupAdminIds, isSuperAdmin)
  if (!staff) {
    throw new NotFoundError('Staff member', targetAdminId)
  }

  const input: PaySalaryInput = {
    targetAdminId,
    amount: data.amount,
    effectiveAdminId,
    actingUserId: user.id,
  }

  try {
    return await paySalary(input)
  } catch (error) {
    if (error instanceof Error && error.message === 'STAFF_NOT_FOUND') {
      throw new NotFoundError('Staff member', targetAdminId)
    }
    throw error
  }
}
