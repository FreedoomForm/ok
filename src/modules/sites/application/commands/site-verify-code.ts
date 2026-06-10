/**
 * Site Verify Code Command — Application layer.
 *
 * Handles OTP verification for site customer authentication.
 */

import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { verifySiteOtpCode } from '../../infrastructure/sites.repository'
import type { SiteAuthResult } from '../../contracts'

export interface SiteVerifyCodeCommand {
  subdomain: string
  phone: string
  code: string
}

/**
 * Execute the Site Verify Code command.
 * Returns auth result with token and customer data.
 */
export async function executeSiteVerifyCode(
  command: SiteVerifyCodeCommand,
): Promise<SiteAuthResult> {
  try {
    return await verifySiteOtpCode(command.subdomain, command.phone, command.code)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new NotFoundError(error.message)
      }
      if (error.message.includes('inactive')) {
        throw new ForbiddenError(error.message)
      }
      if (error.message.includes('Invalid phone') || error.message.includes('6 digits')) {
        throw new BadRequestError(error.message)
      }
      // OTP errors (expired, invalid, etc.)
      if (error.message.includes('OTP') || error.message.includes('ATTEMPTS')) {
        const attemptsLeft = (error as Error & { attemptsLeft?: number }).attemptsLeft
        throw new UnauthorizedError(error.message, { attemptsLeft })
      }
    }
    throw error
  }
}
