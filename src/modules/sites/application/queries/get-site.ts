/**
 * Get Site Query — Application layer.
 *
 * Returns public website data for a given subdomain.
 */

import { NotFoundError } from '@/modules/shared/errors'
import { findSiteBySubdomain } from '../../infrastructure/sites.repository'
import type { WebsiteDTO } from '../../contracts'

export interface GetSiteQuery {
  subdomain: string
}

/**
 * Execute the Get Site query.
 */
export async function executeGetSite(
  query: GetSiteQuery,
): Promise<WebsiteDTO> {
  const site = await findSiteBySubdomain(query.subdomain)
  if (!site) {
    throw new NotFoundError('Website')
  }
  return site
}
