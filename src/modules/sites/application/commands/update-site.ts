/**
 * Update Site Command — Application layer.
 *
 * Handles website creation/update for the admin panel.
 */

import type { AuthUser } from '@/modules/shared/auth'
import { ForbiddenError, BadRequestError, ConflictError } from '@/modules/shared/errors'
import {
  isValidSubdomain,
  normalizeSubdomain,
  RESERVED_SUBDOMAINS,
  DEFAULT_STYLE_VARIANT,
} from '@/modules/sites/infrastructure/site-builder'
import { upsertWebsite } from '../../infrastructure/sites.repository'
import type { SiteUpdateResult, SiteUpdateData } from '../../contracts'
import type { SiteStyleVariant } from '@/modules/sites/infrastructure/site-builder'

export interface UpdateSiteCommand {
  user: AuthUser
  data: SiteUpdateData
}

/**
 * Execute the Update Site command.
 */
export async function executeUpdateSite(
  command: UpdateSiteCommand,
): Promise<SiteUpdateResult> {
  const { user, data } = command

  if (!['MIDDLE_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only admins can update website settings')
  }

  const subdomain = normalizeSubdomain(data.subdomain)

  if (!isValidSubdomain(subdomain)) {
    throw new BadRequestError('Subdomain must be 3-32 chars using letters, numbers, and hyphens')
  }

  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    throw new BadRequestError('This subdomain is reserved')
  }

  try {
    return await upsertWebsite(user.id, {
      subdomain,
      siteName: data.siteName || 'My Site',
      styleVariant: (data.styleVariant || DEFAULT_STYLE_VARIANT) as SiteStyleVariant,
      chatEnabled: data.chatEnabled,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('already used')) {
      throw new ConflictError('Subdomain is already used by another middle-admin')
    }
    throw error
  }
}
