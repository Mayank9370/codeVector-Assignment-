// ─────────────────────────────────────────────────────────────
// Product API Service Layer
// ─────────────────────────────────────────────────────────────

import { PaginatedResponse, ApiResponse } from '../types/products';
import { env } from '../config/env';

export interface FetchProductsParams {
  category?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Fetches products from the backend API.
 * Uses window.location.origin and Vite's dev proxy '/api' connection mapping.
 *
 * @param params Filters including category, limit, and cursor.
 * @returns PaginatedResponse object containing items and metadata.
 */
export async function fetchProducts({ category, limit, cursor }: FetchProductsParams): Promise<PaginatedResponse> {
  const url = new URL(`${env.API_BASE_URL}/products`, window.location.origin);

  if (category && category !== 'all') {
    url.searchParams.append('category', category);
  }
  if (limit) {
    url.searchParams.append('limit', limit.toString());
  }
  if (cursor) {
    url.searchParams.append('cursor', cursor);
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    let errorMessage = 'Network error occurred';
    try {
      const errorPayload: ApiResponse<unknown> = await response.json();
      if (!errorPayload.success && errorPayload.error) {
        errorMessage = errorPayload.error.message;
      }
    } catch {
      // Fail silently and use fallback error
    }
    throw new Error(errorMessage);
  }

  const payload: ApiResponse<PaginatedResponse> = await response.json();

  if (!payload.success) {
    throw new Error(payload.error?.message || 'Failed to fetch products');
  }

  return payload.data;
}
