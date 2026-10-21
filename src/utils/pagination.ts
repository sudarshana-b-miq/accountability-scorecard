export const PAGE_SIZE = 10;

export function pageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize = PAGE_SIZE) {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

export function paginate<T>(rows: readonly T[], page: number, pageSize = PAGE_SIZE) {
  const safePage = clampPage(page, rows.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
