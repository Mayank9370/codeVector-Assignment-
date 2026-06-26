// ─────────────────────────────────────────────────────────────
// Product Module — Type Definitions
// ─────────────────────────────────────────────────────────────
//
// This file is the CONTRACT between every layer of the
// products module. Repository, Service, Controller, and
// Validator all reference these types.
//
// WHY interfaces and not classes?
// Interfaces exist ONLY at compile time — they produce zero
// JavaScript. They are erased completely during compilation.
// Classes generate runtime code (constructors, prototypes).
// For data shapes, we don't need runtime behavior — we just
// need TypeScript to check that objects have the right fields.
//
// WHY not use Zod's inferred types here?
// Zod's inferred types are great for validated INPUT. But
// these types describe DATABASE OUTPUT and INTERNAL data flow.
// Mixing validation types with domain types creates coupling.
// If we change the Zod schema (e.g., add a new query param),
// we don't want to accidentally change the Product shape.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────
//
// Represents a single product row from the database.
//
// WHY does this exist?
// When the repository executes `SELECT * FROM products`, pg
// returns rows as plain JavaScript objects. Without this
// interface, every row is typed as `any` — which means
// you could write `row.prce` (typo) and TypeScript wouldn't
// catch it. With this interface, the repository declares
// "I return Product[]" and TypeScript checks every field access.
//
// WHY do the field names match SQL column names exactly?
// PostgreSQL returns column names as-is. Our columns are
// snake_case (created_at, updated_at). We could transform
// them to camelCase (createdAt, updatedAt), but that adds
// a mapping layer for zero user-facing benefit. The API
// response will use the same snake_case — which is actually
// the more common convention in REST APIs.
//
// WHY is price a string and not a number?
// PostgreSQL NUMERIC(10,2) is returned by the pg driver as
// a string to avoid floating-point precision loss.
// Example: 19.99 in SQL → "19.99" as a string in JS.
// If we typed it as `number`, JavaScript might represent
// $19.99 as 19.990000000000002 — which is unacceptable for
// financial data. The frontend can parse it when needed.
// ─────────────────────────────────────────────────────────────
export interface Product {
  id: string;            // UUID — primary key
  name: string;          // Product name (VARCHAR 255)
  category: string;      // Product category (VARCHAR 100)
  price: string;         // NUMERIC(10,2) — string to avoid float precision issues
  created_at: string;    // ISO 8601 timestamp — when the product was added
  updated_at: string;    // ISO 8601 timestamp — when the product was last modified
}

// ─────────────────────────────────────────────────────────────
// CursorPayload
// ─────────────────────────────────────────────────────────────
//
// The internal structure of a pagination cursor.
//
// WHY does this exist?
// The cursor is sent to the client as an opaque Base64 string.
// But internally, we need to encode/decode it. This interface
// defines WHAT the cursor contains — the two fields that form
// our composite sort key: (created_at, id).
//
// WHY these two fields?
// Our ORDER BY is: created_at DESC, id DESC.
// The cursor must encode the EXACT position of the last item
// on the current page. To seek to that position, we need both
// values. created_at alone is not unique (two products can
// share the same timestamp), so id acts as the tiebreaker.
//
// WHY is this separate from Product?
// Because the cursor is a SUBSET of a product. If we used
// Pick<Product, 'created_at' | 'id'>, we'd tightly couple
// the cursor to the Product interface. If Product changes
// (e.g., we rename a field), the cursor format would break.
// Keeping them separate means the cursor format is an
// independent, stable contract.
// ─────────────────────────────────────────────────────────────
export interface CursorPayload {
  created_at: string;    // ISO 8601 timestamp from the last item
  id: string;            // UUID from the last item
}

// ─────────────────────────────────────────────────────────────
// ProductQueryParams
// ─────────────────────────────────────────────────────────────
//
// The validated, typed query parameters for GET /api/products.
//
// WHY does this exist?
// Express gives us req.query as Record<string, string | undefined>.
// After Zod validation, we have clean, typed values. This
// interface describes the SHAPE of those validated values.
//
// The Controller receives this (not raw strings), passes it
// to the Service. The Service uses it to call the Repository.
//
// WHY is cursor optional?
// The first page request has no cursor. The client only sends
// a cursor when requesting subsequent pages.
//
// WHY is limit required (not optional)?
// The Zod validator provides a default (20) if the client
// doesn't send one. So by the time this reaches the Service,
// limit is ALWAYS a number. Making it required here catches
// any code path that forgets to apply the default.
//
// WHY is category optional?
// Category filtering is optional. If omitted, return all
// products regardless of category.
// ─────────────────────────────────────────────────────────────
export interface ProductQueryParams {
  cursor?: string;       // Opaque Base64 cursor (undefined on first page)
  limit: number;         // Items per page (always present after validation, 1-100)
  category?: string;     // Optional category filter
}

// ─────────────────────────────────────────────────────────────
// PaginationMeta
// ─────────────────────────────────────────────────────────────
//
// Metadata about the current page of results.
//
// WHY a separate interface (not inline)?
// Because both PaginatedResponse and the API response use
// this exact shape. Defining it once prevents drift — if
// the Service constructs one shape and the Controller sends
// a different one, TypeScript catches the mismatch.
//
// WHY nextCursor is string | null (not string | undefined)?
// null means "there is no next page" — it's an explicit value.
// undefined means "we forgot to set it" — it's ambiguous.
// In JSON, null serializes to `"nextCursor": null`.
// undefined would omit the key entirely — the frontend
// can't distinguish "missing key" from "no more pages."
// Explicit null is the cleaner API contract.
// ─────────────────────────────────────────────────────────────
export interface PaginationMeta {
  nextCursor: string | null;   // Base64 cursor for the next page, or null if last page
  hasMore: boolean;            // true if there are more pages after this one
  limit: number;               // The page size that was used (echo back for client convenience)
}

// ─────────────────────────────────────────────────────────────
// PaginatedResponse<T>
// ─────────────────────────────────────────────────────────────
//
// The shape returned by the Service layer for any paginated
// query.
//
// WHY generic <T>?
// Today T is Product. Tomorrow it could be Brand, Order, or
// User. A generic paginated response is reusable across any
// module. If we hardcoded Product here, every new module
// would need its own PaginatedProductsResponse,
// PaginatedBrandsResponse, etc. — that's duplication.
//
// WHY does the Service return this (not the Controller)?
// The Service is responsible for pagination logic — it knows
// whether there are more pages and what the next cursor is.
// The Controller just wraps this in successResponse() and
// sends it. Putting pagination logic in the Controller would
// violate separation of concerns.
// ─────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  products: T[];               // The items for the current page
  pagination: PaginationMeta;  // Pagination metadata (cursor, hasMore, limit)
}
