/**
 * Manage Menu Dishes Command — Application layer.
 *
 * Attach/detach a dish to/from a menu (by menu number). Validates input and
 * maps a missing menu to a NotFoundError so routes stay thin.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { Prisma } from '@prisma/client'
import {
  connectDishToMenu,
  disconnectDishFromMenu,
} from '../../infrastructure/warehouse.repository'
import type { MenuDetailDTO } from '../../contracts'

export interface ManageMenuDishCommand {
  user: AuthUser
  menuNumber: number
  dishId: string
}

function assertValid(command: ManageMenuDishCommand): void {
  if (
    command.menuNumber === undefined ||
    command.menuNumber === null ||
    Number.isNaN(command.menuNumber) ||
    !command.dishId
  ) {
    throw new BadRequestError('menuNumber and dishId are required')
  }
}

/** Attach a dish to a menu. Throws NotFoundError if the menu does not exist. */
export async function executeAddDishToMenu(
  command: ManageMenuDishCommand,
): Promise<MenuDetailDTO> {
  assertValid(command)
  try {
    return await connectDishToMenu(command.menuNumber, command.dishId)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundError('Menu')
    }
    throw error
  }
}

/** Detach a dish from a menu. Throws NotFoundError if the menu does not exist. */
export async function executeRemoveDishFromMenu(
  command: ManageMenuDishCommand,
): Promise<MenuDetailDTO> {
  assertValid(command)
  try {
    return await disconnectDishFromMenu(command.menuNumber, command.dishId)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundError('Menu')
    }
    throw error
  }
}
