-- ─────────────────────────────────────────────────────────────
-- Products Schema Definitions
-- ─────────────────────────────────────────────────────────────
--
-- This file defines the tables and indexes required for the
-- Products module. It supports:
--   - High-precision pricing via NUMERIC
--   - Globally unique identifiers via UUID
--   - Constant-time cursor pagination via composite indexes
-- ─────────────────────────────────────────────────────────────

-- Ensure uuid-ossp extension is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- products Table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
--
-- Index 1: Powers the default "browse newest" query
-- Query: SELECT * FROM products ORDER BY created_at DESC, id DESC LIMIT $1
-- Query (pagination): SELECT * FROM products WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT $3
--
-- WHY (created_at DESC, id DESC)?
-- Matches the ORDER BY clause exactly. Allows the DB planner to traverse
-- the index in sorted order, performing index scan and avoiding a filesort
-- on 200,000 rows.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_created_at_id
    ON products (created_at DESC, id DESC);

-- ─────────────────────────────────────────────────────────────
-- Index 2: Powers category-filtered pagination
-- Query: SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC, id DESC LIMIT $2
-- Query (pagination): SELECT * FROM products WHERE category = $1 AND (created_at, id) < ($2, $3) ORDER BY created_at DESC, id DESC LIMIT $4
--
-- WHY category as the first column?
-- The "Leftmost Rule" of composite indexes. PostgreSQL can perform an equality match
-- on the first column (category), then do a sorted range scan on (created_at, id).
-- Placing category last would prevent the index from being used for category filtering.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category_created_at_id
    ON products (category, created_at DESC, id DESC);
