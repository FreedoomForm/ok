import {
  MAX_PAGE_SIZE,
  parseBoundedPagination,
  type BoundedPagination,
} from '@/lib/pagination'

export const MAX_ORDER_PAGE_SIZE = MAX_PAGE_SIZE
export type OrderPagination = BoundedPagination
export const parseOrderPagination = parseBoundedPagination
