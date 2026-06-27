// ─────────────────────────────────────────────────────────────
// Client Environment Configuration Manager
// ─────────────────────────────────────────────────────────────
//
// Reads, validates, and exports environment configurations.
// Ensures we fail fast during application startup if values are missing.
//
// WHY this file exists:
// - Consolidates environment variable parsing and shape validation in one spot.
// - Prevents direct access to `import.meta.env` throughout components/hooks.
// - Guarantees type-safety for all runtime configurations.
// ─────────────────────────────────────────────────────────────

interface EnvConfig {
  API_BASE_URL: string;
}

// Read the VITE_ prefixed base URL from Vite context
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fail fast at module evaluation time if configuration is missing
if (!VITE_API_BASE_URL) {
  const errorMsg = '🚨 Environment validation failed: VITE_API_BASE_URL is not defined in client environment variables.';
  // eslint-disable-next-line no-console
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const env: EnvConfig = {
  API_BASE_URL: VITE_API_BASE_URL,
};
