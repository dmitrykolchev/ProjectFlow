export type PaginationLayoutMode = 'table' | 'cards';

export const TABLE_PAGE_SIZE_OPTIONS: readonly number[] = [5, 10, 20, 50, 100];
export const CARD_GRID_PAGE_SIZE_OPTIONS: readonly number[] = [4, 6, 8, 9, 12, 18, 24];

export interface PaginatedSlice<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): PaginatedSlice<T> {
  const safeSize = Math.max(1, Math.floor(Number(pageSize) || 10));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const safePage = Math.max(1, Math.min(Math.floor(Number(page) || 1), totalPages));
  const start = (safePage - 1) * safeSize;

  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems,
    totalPages,
  };
}
