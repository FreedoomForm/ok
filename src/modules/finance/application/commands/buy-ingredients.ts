/**
 * Buy Ingredients Command — Application layer.
 *
 * Handles ingredient purchasing with:
 * - Role-based scoping for effective admin ID
 * - Company balance check
 * - Warehouse stock update
 * - Unit conversion and validation
 */

import { getOwnerAdminId } from '@/lib/admin-scope'
import type { AuthUser } from '@/lib/auth-utils'
import type { BuyIngredientsData, BuyIngredientsResult } from '../../contracts'
import {
  buyIngredients,
  type BuyIngredientsInput,
} from '../../infrastructure/finance.repository'
import { BadRequestError } from '@/modules/shared/errors'
import { z } from 'zod'

const BuyIngredientsSchema = z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1),
    amount: z.number().positive(),
    costPerUnit: z.number().nonnegative(),
    unit: z.string().trim().min(1).default('kg'),
    kcalPerGram: z.number().nonnegative().optional(),
  })),
})

export interface BuyIngredientsCommand {
  user: AuthUser
  data: BuyIngredientsData
}

/**
 * Execute the Buy Ingredients command.
 */
export async function executeBuyIngredients(
  command: BuyIngredientsCommand,
): Promise<BuyIngredientsResult> {
  const { user, data } = command

  // Validate input
  const validation = BuyIngredientsSchema.safeParse(data)
  if (!validation.success) {
    throw new BadRequestError('Invalid data', { details: validation.error.flatten() })
  }

  // Resolve effective admin ID
  const effectiveAdminId =
    user.role === 'LOW_ADMIN'
      ? (await getOwnerAdminId(user)) ?? user.id
      : user.id

  const input: BuyIngredientsInput = {
    items: validation.data.items.map((item) => ({
      name: item.name,
      amount: item.amount,
      costPerUnit: item.costPerUnit,
      unit: item.unit,
      kcalPerGram: item.kcalPerGram,
    })),
    effectiveAdminId,
    actingUserId: user.id,
  }

  try {
    return await buyIngredients(input)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        throw new BadRequestError('Insufficient company balance')
      }
      if (error.message === 'ADMIN_NOT_FOUND') {
        throw new BadRequestError('Admin not found')
      }
      if (error.message.startsWith('UNIT_MISMATCH:')) {
        const [, name, existingUnit, newUnit] = error.message.split(':')
        throw new BadRequestError(
          `Unit mismatch for ${name}: warehouse uses ${existingUnit}, attempted to buy in ${newUnit}`,
        )
      }
    }
    throw error
  }
}
