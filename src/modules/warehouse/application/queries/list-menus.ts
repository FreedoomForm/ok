/**
 * List Menus / Get Menu queries — Application layer.
 *
 * Read use-cases for menus (numbered dish collections). Menus are global
 * reference data (not tenant-scoped), so these queries simply delegate to the
 * repository after the route has enforced authentication.
 */

import type { AuthUser } from '@/modules/shared/auth'
import {
  listMenuSummaries,
  getMenuByNumber,
} from '../../infrastructure/warehouse.repository'
import type { MenuSummaryDTO, MenuDetailDTO } from '../../contracts'

export interface ListMenusQuery {
  user: AuthUser
}

export interface GetMenuQuery {
  user: AuthUser
  number: number
}

/** List all menus as summaries (number + dish count). */
export async function executeListMenus(
  _query: ListMenusQuery,
): Promise<MenuSummaryDTO[]> {
  return listMenuSummaries()
}

/** Get a single menu by number (including its dishes), or `null`. */
export async function executeGetMenu(
  query: GetMenuQuery,
): Promise<MenuDetailDTO | null> {
  return getMenuByNumber(query.number)
}
