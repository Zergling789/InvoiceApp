export type DocumentCursor = {
  createdAt: string;
  id: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: DocumentCursor | null;
  hasMore: boolean;
};

export type CursorPageOptions = {
  cursor?: DocumentCursor | null;
  pageSize?: number;
};

export type DocumentPageOptions = CursorPageOptions & {
  search?: string;
  phases?: string[];
  today?: string;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export function normalizePageSize(pageSize?: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize ?? DEFAULT_PAGE_SIZE)));
}

export const quotePostgrestValue = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export function buildDescendingCursorFilter(cursor: DocumentCursor): string {
  const createdAt = quotePostgrestValue(cursor.createdAt);
  const id = quotePostgrestValue(cursor.id);
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`;
}

export function buildIlikeAnyFilter(
  columns: string[],
  search: string,
  extraFilters: string[] = [],
): string {
  const escapedSearch = search.trim().slice(0, 100).replace(/[\\%_]/g, "\\$&");
  const pattern = quotePostgrestValue(`%${escapedSearch}%`);
  return [
    ...columns.map((column) => `${column}.ilike.${pattern}`),
    ...extraFilters,
  ].join(",");
}

export function buildInFilter(column: string, values: string[]): string {
  return `${column}.in.(${values.map(quotePostgrestValue).join(",")})`;
}

export function createCursorPage<Row extends { id: string; created_at: string }, Item>(
  rows: Row[],
  pageSize: number,
  mapRow: (row: Row) => Item,
): CursorPage<Item> {
  const visibleRows = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const lastRow = visibleRows.at(-1);

  return {
    items: visibleRows.map(mapRow),
    hasMore,
    nextCursor:
      hasMore && lastRow
        ? { createdAt: lastRow.created_at, id: lastRow.id }
        : null,
  };
}
