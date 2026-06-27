// ─────────────────────────────────────────────────────────────
// Product Query Validation Schema
// ─────────────────────────────────────────────────────────────
//
// Defines WHAT valid query parameters look like for
// GET /api/products.
//
// This file is DECLARATIVE — it describes rules, not procedures.
// It says "limit must be an integer between 1 and 100" but
// doesn't say how to handle violations. The validation
// middleware (separate file) runs this schema and decides
// how to format errors.
//
// WHAT LAYER IS THIS?
// This is the STRUCTURAL validation layer. It answers:
//   "Is the data shaped correctly?"
// It does NOT answer:
//   "Does the cursor decode to valid data?" (semantic → service)
//   "Does the category exist in the database?" (business → service)
// ─────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// productQuerySchema
// ─────────────────────────────────────────────────────────────
//
// Validates and transforms the raw query string parameters
// from Express's req.query into clean, typed values.
//
// IMPORTANT: Every value in req.query is a STRING.
// When a user sends GET /api/products?limit=20, Express
// gives us { limit: "20" } — the STRING "20", not the
// NUMBER 20. This is an HTTP fundamental: query parameters
// are always strings. Zod's coerce handles the conversion.
// ─────────────────────────────────────────────────────────────
export const productQuerySchema = z.object({
  // ─────────────────────────────────────────────────────────
  // cursor
  // ─────────────────────────────────────────────────────────
  //
  // The pagination cursor — an opaque Base64 string.
  //
  // WHY optional()?
  // The first page request has no cursor:
  //   GET /api/products           → cursor is undefined
  //   GET /api/products?cursor=   → cursor is ""
  //   GET /api/products?cursor=abc → cursor is "abc"
  //
  // WHY min(1)?
  // An empty string cursor ("") is meaningless. If someone
  // sends ?cursor= (empty), we should treat it as "no cursor"
  // rather than passing an empty string to the service which
  // would then fail during Base64 decoding.
  //
  // WHY NOT decode Base64 or validate UUID here?
  // That's SEMANTIC validation. This schema only checks
  // STRUCTURE: "if present, it must be a non-empty string."
  // The service layer calls decodeCursor() and validates
  // the contents.
  //
  // The .optional() + .transform() combo handles the edge case:
  //   ?cursor=  → after transform → undefined (treated as first page)
  //   ?cursor=abc123 → stays as "abc123"
  // ─────────────────────────────────────────────────────────
  cursor: z.string().min(1).optional(),

  // ─────────────────────────────────────────────────────────
  // limit
  // ─────────────────────────────────────────────────────────
  //
  // How many items to return per page.
  //
  // WHY z.coerce.number() instead of z.number()?
  //
  // z.number() expects an ACTUAL number. But req.query.limit
  // is the STRING "20". z.number().parse("20") → ERROR.
  //
  // z.coerce.number() runs Number("20") first → 20, then
  // validates. This is the correct approach for any value
  // coming from a URL query string.
  //
  // WHY .int()?
  // Without it, limit=20.5 would be accepted. You can't
  // return 20.5 products. LIMIT in SQL must be an integer.
  //
  // WHY .min(1)?
  // limit=0 means "return nothing." That's a pointless
  // request that wastes a database connection. Reject it.
  //
  // WHY .max(100)?
  // This is a safety guard. Without it, a client could send
  // limit=1000000, which would:
  //   1. Transfer 1M rows over the network
  //   2. Use massive memory to serialize the JSON response
  //   3. Block the database connection for seconds
  //   4. Potentially crash the server with OOM
  //
  // 100 is a reasonable upper bound: enough for any UI,
  // small enough to keep queries fast.
  //
  // WHY .default(20)?
  // If the client doesn't send a limit, we use 20.
  // This default lives HERE (not in the service) because:
  //   1. The service receives ProductQueryParams where limit
  //      is REQUIRED (not optional). That type contract means
  //      the default must be applied BEFORE reaching the service.
  //   2. Defaults are a validation concern — they define
  //      "what does a missing value mean?"
  //   3. Having the default in one place prevents the controller
  //      and service from each applying different defaults.
  // ─────────────────────────────────────────────────────────
  limit: z.coerce
    .number()
    .int({ message: 'limit must be a whole number' })
    .min(1, { message: 'limit must be at least 1' })
    .max(100, { message: 'limit must be at most 100' })
    .default(20),

  // ─────────────────────────────────────────────────────────
  // category
  // ─────────────────────────────────────────────────────────
  //
  // Optional category filter.
  //
  // WHY .trim()?
  // Users (and frontends) sometimes send whitespace:
  //   ?category=  electronics   → should become "electronics"
  //   ?category=%20electronics  → same thing, URL-encoded
  //
  // Without trim, the repository would query for " electronics"
  // (with a leading space), find zero results, and the user
  // would think the category doesn't exist. A silent,
  // maddening bug. Trim prevents it.
  //
  // WHY .min(1) AFTER .trim()?
  // If someone sends ?category=%20%20%20 (all spaces), after
  // trimming it becomes "". An empty category is meaningless —
  // the repository would query WHERE category = '' and return
  // nothing. min(1) catches this edge case.
  //
  // WHY .max(100)?
  // Our database column is VARCHAR(100). If someone sends a
  // 10,000-character category, the SQL query would fail with
  // a database error. Better to reject it at the HTTP boundary
  // with a clear validation message than let it reach the DB.
  //
  // WHY NOT validate that the category exists in the DB?
  // That's BUSINESS validation, not structural. Checking the
  // DB here would require a database call in the validation
  // middleware — mixing HTTP concerns with data access.
  // Instead, if the category doesn't exist, the repository
  // simply returns an empty array. That's the correct behavior:
  // "no products match this filter."
  // ─────────────────────────────────────────────────────────
  category: z
    .string()
    .trim()
    .min(1, { message: 'category must not be empty' })
    .max(100, { message: 'category must be at most 100 characters' })
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// Inferred type from the schema.
//
// WHY export this type?
// The validation middleware will use this type to pass
// validated data to the controller. Zod's z.infer extracts
// the OUTPUT type after all transforms and defaults:
//
//   ValidatedProductQuery = {
//     cursor?: string | undefined;
//     limit: number;             ← always present (has default)
//     category?: string | undefined;
//   }
//
// Notice this matches our ProductQueryParams interface
// in product.types.ts EXACTLY. That's not a coincidence —
// we designed both to align. But they serve different purposes:
//   - ProductQueryParams is the DOMAIN type (used by service/repo)
//   - ValidatedProductQuery is the VALIDATION type (used by middleware)
//
// Today they're identical. But if we add a query param that
// the service doesn't need (e.g., a debug flag), they'd diverge.
// Keeping them separate respects the separation of concerns.
// ─────────────────────────────────────────────────────────────
export type ValidatedProductQuery = z.infer<typeof productQuerySchema>;
