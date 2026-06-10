/**
 * Site Send Code Command — Application layer.
 *
 * Handles sending OTP verification code to a customer's phone.
 */

import { BadRequestError, ForbiddenError, NotFoundError, AppError } from '@/modules/shared/errors'
import { sendSiteOtpCode } from '../../infrastructure/sites.repository'
import type { SiteSendCodeResult } from '../../contracts'

export interface SiteSendCodeCommand {
  subdomain: string
  phone: string
}

/**
 * Execute the Site Send Code command.
 */
export async function executeSiteSendCode(
  command: SiteSendCodeCommand,
): Promise<SiteSendCodeResult> {
  try {
    return await sendSiteOtpCode(command.subdomain, command.phone)
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
      if (error.message.includes('wait before')) {
        const retryAfterSec = (error as Error & { retryAfterSec?: number }).retryAfterSec
        throw new AppError('RATE_LIMITED', error.message, 429, { retryAfterSec })
      }
      if (error.message.includes('Failed to send')) {
        throw new AppError('SMS_FAILED', error.message, 502, {
          provider: (error as Error & { provider?: string }).provider,
        })
      }
    }
    throw error
  }
}
