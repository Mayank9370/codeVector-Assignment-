// ─────────────────────────────────────────────────────────────
// Frontend TypeScript Contracts
// ─────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedResponse {
  products: Product[];
  pagination: PaginationMeta;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
