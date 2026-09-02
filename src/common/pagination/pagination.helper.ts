export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginateResponse<T>(
  data: T[],
  total: number,
  page: number = 1,
  perPage: number = 10,
): PaginatedResult<T> {
  const currentPage = Number(page) || 1;
  const limit = Number(perPage) || 10;
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

  return {
    data,
    meta: {
      total,
      page: currentPage,
      perPage: limit,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
}
