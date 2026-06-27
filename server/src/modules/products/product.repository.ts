// ─────────────────────────────────────────────────────────────
// Product Module — Repository Layer
// ─────────────────────────────────────────────────────────────
//
// WHY this layer exists:
// - Encapsulates all SQL execution, pool interactions, and data mappings.
// - Keeps SQL query logic isolated from Service-level business rules.
// - Ensures that no HTTP details (req, res) bleed into data access.
//
// Inputs:
// - Raw query values (category, limit + 1, cursor details).
// Outputs:
// - Promise<Product[]> (strongly-typed raw DB rows).
// ─────────────────────────────────────────────────────────────

import { db } from '../../config';
import { Product, CursorPayload } from './product.types';

export interface FindProductsParams {
  category?: string;
  limit: number; // This will already be set to limit + 1 by the caller
  cursor?: CursorPayload; // Decoded cursor values
}

/**
 * ProductRepository
 * Handles all database operations related to the products table.
 */
export const productRepository = {
  /**
   * Finds products based on category filters and cursor positions.
   *
   * @param params FindProductsParams containing category, limit + 1, and cursor.
   * @returns Raw array of Products from the database.
   */
  async findProducts({ category, limit, cursor }: FindProductsParams): Promise<Product[]> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    // 1. Dynamically build WHERE conditions and parameters
    if (category) {
      params.push(category);
      whereClauses.push(`category = $${params.length}`);
    }

    if (cursor) {
      params.push(cursor.created_at);
      params.push(cursor.id);
      whereClauses.push(`(created_at, id) < ($${params.length - 1}, $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 2. Append limit parameter
    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

    // 3. Assemble complete SQL query
    const sql = `
      SELECT id, name, category, price, created_at, updated_at
      FROM products
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitPlaceholder}
    `;

    // 4. Execute parameterized query against pg pool
    const result = await db.query<Product>(sql, params);

    return result.rows;
  },
};
