// ─────────────────────────────────────────────────────────────
// Page-based Cursor Paginated Hook
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types/products';
import { fetchProducts } from '../services/products.api';

export function useProducts(initialCategory = 'all', initialLimit = 20) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  const [category, setCategory] = useState(initialCategory);
  const [limit, setLimit] = useState(initialLimit);
  const [currentPage, setCurrentPage] = useState(1);

  // Cache cursors for each page index.
  // pageCursorsRef.current[0] -> Page 1 cursor (always undefined)
  // pageCursorsRef.current[1] -> Page 2 cursor (nextCursor from Page 1), etc.
  const pageCursorsRef = useRef<(string | undefined)[]>([undefined]);

  // Core fetch function
  const loadPage = useCallback(
    async (pageIndex: number, filterCategory: string, pageLimit: number) => {
      setLoading(true);
      setError(null);

      try {
        const cursor = pageCursorsRef.current[pageIndex - 1];
        const data = await fetchProducts({
          category: filterCategory,
          limit: pageLimit,
          cursor,
        });

        // For page-by-page rendering, we REPLACE the products array instead of appending
        setProducts(data.products);
        setHasMore(data.pagination.hasMore);
        
        // Cache the next cursor for the next page index
        if (data.pagination.hasMore && data.pagination.nextCursor) {
          pageCursorsRef.current[pageIndex] = data.pagination.nextCursor;
        } else {
          pageCursorsRef.current[pageIndex] = undefined;
        }

        setCurrentPage(pageIndex);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Trigger load when category or limit changes (resets to page 1)
  useEffect(() => {
    pageCursorsRef.current = [undefined];
    loadPage(1, category, limit);
  }, [category, limit, loadPage]);

  // Navigate to Next Page
  const nextPage = useCallback(() => {
    if (loading || !hasMore) {
      return;
    }
    loadPage(currentPage + 1, category, limit);
  }, [loading, hasMore, currentPage, category, limit, loadPage]);

  // Navigate to Previous Page
  const prevPage = useCallback(() => {
    if (loading || currentPage <= 1) {
      return;
    }
    loadPage(currentPage - 1, category, limit);
  }, [loading, currentPage, category, limit, loadPage]);

  // Trigger category updates (resets pagination)
  const changeCategory = useCallback((newCategory: string) => {
    setCategory(newCategory);
  }, []);

  // Trigger limit updates (resets pagination)
  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
  }, []);

  return {
    products,
    loading,
    error,
    hasMore,
    category,
    limit,
    currentPage,
    nextPage,
    prevPage,
    changeCategory,
    changeLimit,
  };
}
