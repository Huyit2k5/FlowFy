import { type NextRequest } from "next/server";

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export function getPagination(request: NextRequest, maxPageSize = 100): PaginationParams {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(searchParams.get("page_size") ?? "20", 10) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
) {
  return {
    data,
    pagination: {
      page: params.page,
      page_size: params.pageSize,
      total,
      total_pages: Math.ceil(total / params.pageSize),
      has_next: params.page * params.pageSize < total,
      has_prev: params.page > 1,
    },
  };
}
