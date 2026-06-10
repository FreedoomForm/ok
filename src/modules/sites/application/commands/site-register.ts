/**
 * Site Register Command — Application layer.
 *
 * Handles customer registration on a site.
 */

import { BadRequestError, ConflictError, NotFoundError } from '@/modules/shared/errors'
import { siteRegister } from '../../infrastructure/sites.repository'
import type { SiteRegistrationResult, SiteRegistrationData } from '../../contracts'

export interface SiteRegisterCommand {
  subdomain: string
  data: SiteRegistrationData
}

/**
 * Execute the Site Register command.
 */
export async function executeSiteRegister(
  command: SiteRegisterCommand,
): Promise<SiteRegistrationResult> {
  try {
    return await siteRegister(command.subdomain, command.data.phone, command.data.name)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new NotFoundError(error.message)
      }
      if (error.message.includes('already registered')) {
        throw new ConflictError(error.message)
      }
      if (error.message.includes('Invalid phone')) {
        throw new BadRequestError(error.message)
      }
    }
    throw error
  }
}
