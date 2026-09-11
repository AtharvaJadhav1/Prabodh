export function parsePagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
