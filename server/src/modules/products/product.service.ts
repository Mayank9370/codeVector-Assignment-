// ─────────────────────────────────────────────────────────────
// Product Module — Service Layer
// ─────────────────────────────────────────────────────────────
//
// WHY this layer exists:
// - Acts as the core orchestrator of business logic and workflows.
// - Performs cursor decoding and semantic cursor validations.
// - Applies the limit+1 pagination logic and generates nextCursor tokens.
// - Decoupled from HTTP frameworks (no Express req/res objects).
// ─────────────────────────────────────────────────────────────

import { productRepository } from './product.repository';
import { Product, PaginatedResponse, CursorPayload } from './product.types';
import { encodeCursor, decodeCursor } from '../../utils/cursor';
import { AppError } from '../../utils/appError';

export interface GetProductsServiceParams {
  category?: string;
  limit: number;
  cursor?: string;
}

export const productService = {
  /**
   * Retrieves a paginated list of products, optionally filtered by category.
   *
   * @param params Parameters including category, limit, and encoded cursor.
   * @returns PaginatedResponse containing products and pagination metadata.
   */
  async getProducts({
    category,
    limit,
    cursor,
  }: GetProductsServiceParams): Promise<PaginatedResponse<Product>> {
    // 1. Process and validate the pagination cursor if provided
    const decodedCursor = this.processCursor(cursor);

    // 2. Fetch products using the limit + 1 trick to identify if there are more items
    const limitToQuery = limit + 1;
    const rawProducts = await productRepository.findProducts({
      category,
      limit: limitToQuery,
      cursor: decodedCursor || undefined,
    });

    // 3. Evaluate pagination state and format output
    return this.buildPaginatedResponse(rawProducts, limit);
  },

  /**
   * Decodes and validates the cursor.
   *
   * @param cursor The opaque cursor string.
   * @returns CursorPayload if valid, undefined if no cursor was provided.
   * @throws AppError if cursor is malformed or invalid.
   */
  processCursor(cursor?: string): CursorPayload | undefined {
    if (!cursor) {
      return undefined;
    }

    const decoded = decodeCursor(cursor);

    // Structural validation: Ensure it is a valid object with required properties
    if (!decoded || typeof decoded.created_at !== 'string' || typeof decoded.id !== 'string') {
      throw new AppError(
        400,
        'INVALID_CURSOR',
        'The pagination token provided is malformed or invalid.',
      );
    }

    // Semantic validation: Ensure date is valid and id is a valid UUID
    const isValidDate = !isNaN(Date.parse(decoded.created_at));
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(decoded.id);

    if (!isValidDate || !isValidUuid) {
      throw new AppError(400, 'INVALID_CURSOR', 'The pagination token contents are invalid.');
    }

    return decoded;
  },

  /**
   * Performs the limit + 1 calculation, slices the results, and constructs response metadata.
   *
   * @param products The raw rows returned from the repository.
   * @param limit The original limit requested by the client.
   * @returns PaginatedResponse payload.
   */
  buildPaginatedResponse(products: Product[], limit: number): PaginatedResponse<Product> {
    const hasMore = products.length > limit;

    // Slice off the extra record if present
    const slicedProducts = hasMore ? products.slice(0, limit) : products;

    const lastItem = slicedProducts[slicedProducts.length - 1];
    let nextCursor: string | null = null;

    if (hasMore && lastItem) {
      nextCursor = encodeCursor({
        created_at: lastItem.created_at,
        id: lastItem.id,
      });
    }

    return {
      products: slicedProducts,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  },
};
