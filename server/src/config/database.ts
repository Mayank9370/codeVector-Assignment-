import { Pool } from 'pg';
import { env } from './environment';

// ─────────────────────────────────────────────────────────────
// Connection Pool — the singleton.
//
// WHY Pool and not Client?
// - Client = one connection. If it's busy, the next request waits.
// - Pool = multiple connections. Requests are served concurrently.
//
// WHY these specific pool settings?
// - max: 20 → Supabase free tier allows ~60 connections. We use
//   20 to leave room for Supabase's own internal connections and
//   other services. For a paid tier, you'd increase this.
// - idleTimeoutMillis: 30000 → If a connection sits idle for 30s,
//   release it. Prevents holding connections we're not using.
// - connectionTimeoutMillis: 5000 → If a connection can't be
//   established in 5 seconds, fail the request instead of
//   hanging forever. Users prefer fast errors over infinite loading.
// ─────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,

  // ─────────────────────────────────────────────────────────
  // SSL: Required for Supabase (and most cloud PostgreSQL).
  // rejectUnauthorized: false is needed because Supabase uses
  // self-signed certificates in some configurations.
  // In a production enterprise app, you'd pin the CA certificate.
  // For an internship assignment, this is the pragmatic choice.
  // ─────────────────────────────────────────────────────────
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ─────────────────────────────────────────────────────────────
// Pool error handler.
//
// WHY: If a connection in the pool encounters an unexpected
// error (e.g., the database restarts), the pool emits an 'error'
// event. If we don't handle it, Node.js crashes with an
// unhandled error. By listening, we log it and the pool
// automatically replaces the broken connection.
// ─────────────────────────────────────────────────────────────
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('🔴 Unexpected database pool error:', err.message);
});

// ─────────────────────────────────────────────────────────────
// Health check function.
//
// Called by server.ts at startup to verify the database is
// reachable BEFORE accepting HTTP requests.
// Also used by the /health endpoint for monitoring.
//
// WHY a simple query?
// SELECT 1 is the cheapest possible query. It doesn't read any
// table — it just proves the connection works. It's the database
// equivalent of a "ping".
// ─────────────────────────────────────────────────────────────
export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    // ALWAYS release the connection back to the pool.
    // If you forget this, you leak connections — the pool
    // eventually runs out and the app hangs.
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// Graceful shutdown.
//
// Called by server.ts when the process receives SIGTERM/SIGINT.
// Drains all active connections cleanly instead of cutting them
// off mid-query. This prevents data corruption and connection
// leaks on the PostgreSQL side.
// ─────────────────────────────────────────────────────────────
export async function closePool(): Promise<void> {
  await pool.end();
}

// ─────────────────────────────────────────────────────────────
// Export the pool for use by repository layers.
//
// Repositories call: db.query('SELECT ...', [params])
// They never create their own Pool or Client.
// ─────────────────────────────────────────────────────────────
export const db = pool;
