/**
 * Cook Command — Application layer.
 *
 * Handles cooking plan execution: deducts ingredients from warehouse
 * and updates cooking plan stats.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError } from '@/modules/shared/errors'
import { executeCookTransaction } from '../../infrastructure/warehouse.repository'
import type { CookData, CookResult } from '../../contracts'

export interface CookCommand {
  user: AuthUser
  data: CookData
}

/**
 * Execute the Cook command.
 *
 * Delegates to the repository for the transactional cook operation.
 * Handles validation and transforms error messages for the API layer.
 */
export async function executeCook(
  command: CookCommand,
): Promise<CookResult> {
  const { data } = command

  if (!data.date || !data.updates || !Array.isArray(data.updates)) {
    throw new BadRequestError('Invalid request format')
  }

  try {
    return await executeCookTransaction({
      date: new Date(data.date),
      menuNumber: data.menuNumber,
      updates: data.updates,
      activeSetId: data.activeSetId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process cooking'

    // Re-throw business logic errors as BadRequestError
    if (
      message.includes('Insufficient stock') ||
      message.includes('Ingredient not found') ||
      message.includes('Недостаточно') ||
      message.includes('не найден')
    ) {
      throw new BadRequestError(message)
    }

    throw error
  }
}
