// ─────────────────────────────────────────────────────────────
// Config barrel file.
//
// WHY: Consumers write one clean import:
//   import { env, db, testConnection, closePool } from './config';
//
// Instead of remembering which sub-file holds what:
//   import { env } from './config/environment';
//   import { db, testConnection } from './config/database';
//
// If we later add a Redis config or a logger config, we add
// it here — all consumers get it from the same import path.
// ─────────────────────────────────────────────────────────────
export { env } from './environment';
export { db, testConnection, closePool } from './database';
