/**
 * Site Login Command — Application layer.
 *
 * Handles direct customer login on a site (without OTP).
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { siteLogin } from '../../infrastructure/sites.repository'
import type { SiteAuthResult } from '../../contracts'

export interface SiteLoginCommand {
  subdomain: string
  phone: string
}

/**
 * Execute the Site Login command.
 * Returns auth result with token and customer data.
 */
export async function executeSiteLogin(
  command: SiteLoginCommand,
): Promise<SiteAuthResult> {
  try {
    return await siteLogin(command.subdomain, command.phone)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new NotFoundError(error.message)
      }
      if (error.message.includes('inactive')) {
        throw new ForbiddenError(error.message)
      }
      if (error.message.includes('Invalid phone')) {
        throw new BadRequestError(error.message)
      }
    }
    throw error
  }
}
