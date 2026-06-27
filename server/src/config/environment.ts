import { z } from 'zod';
import dotenv from 'dotenv';

// ─────────────────────────────────────────────────────────────
// Load .env file FIRST, before we validate.
// In production, env vars are injected by the platform (Heroku,
// Railway, etc.), so .env may not exist — and that's fine.
// dotenv silently does nothing if .env is missing.
// ─────────────────────────────────────────────────────────────
dotenv.config();

// ─────────────────────────────────────────────────────────────
// Schema: Define WHAT environment variables we need and their
// types/constraints. This is the single source of truth.
//
// WHY Zod for this?
// - process.env values are ALWAYS strings (even PORT="3000").
//   Zod's .coerce.number() converts "3000" → 3000 automatically.
// - If a required var is missing, Zod gives a clear error message
//   instead of a cryptic undefined crash later.
// - The parsed output is fully typed — TypeScript knows
//   env.PORT is a number, not string | undefined.
// ─────────────────────────────────────────────────────────────
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database (Supabase PostgreSQL)
  DATABASE_URL: z
    .string()
    .url({ message: 'DATABASE_URL must be a valid PostgreSQL connection string' }),

  // CORS (the React frontend's URL)
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

// ─────────────────────────────────────────────────────────────
// Parse & validate — this is where fail-fast happens.
//
// safeParse returns { success: true, data } or { success: false, error }.
// We use safeParse (not parse) so we can format the error message
// ourselves before crashing — much more helpful in logs.
// ─────────────────────────────────────────────────────────────
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // ─────────────────────────────────────────────────────────
  // Format each validation error on its own line.
  // Example output:
  //   ❌ DATABASE_URL: Required
  //   ❌ PORT: Expected number, received "abc"
  //
  // This runs at import time (when server.ts imports config).
  // If it fails, Node exits before Express even starts.
  // ─────────────────────────────────────────────────────────
  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `  ❌ ${path}: ${issue.message}`;
  });

  // eslint-disable-next-line no-console
  console.error('\n🚨 Environment validation failed:\n');
  // eslint-disable-next-line no-console
  console.error(errors.join('\n'));
  // eslint-disable-next-line no-console
  console.error('\n   Check your .env file against .env.example\n');

  // Exit code 1 = failure. The process stops here.
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// Export the validated, typed environment object.
//
// Every file in the project imports `env` from here.
// TypeScript knows:
//   env.PORT      → number
//   env.NODE_ENV  → 'development' | 'production' | 'test'
//   env.DATABASE_URL → string (guaranteed non-empty)
//
// Nobody ever writes process.env.PORT again.
// ─────────────────────────────────────────────────────────────
export const env = parsed.data;
