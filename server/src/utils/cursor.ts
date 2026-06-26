// ─────────────────────────────────────────────────────────────
// Cursor Utility — Encode & Decode
// ─────────────────────────────────────────────────────────────
//
// Pure utility functions for cursor-based pagination.
//
// These functions know NOTHING about products, databases, or
// Express. They convert a JavaScript object to a URL-safe
// string and back. That's it.
//
// WHY are these standalone functions (not a class)?
// There's no state to manage. No constructor, no properties.
// A class with only static methods is just a namespace —
// and TypeScript already has modules for that. Functions
// are simpler, easier to test, and tree-shakable.
// ─────────────────────────────────────────────────────────────

import { CursorPayload } from '../modules/products/product.types';

// ─────────────────────────────────────────────────────────────
// encodeCursor
// ─────────────────────────────────────────────────────────────
//
// Takes a CursorPayload and returns an opaque Base64 string.
//
// Flow:
//   { created_at: "2026-06-26T14:00:00.000Z", id: "abc-123" }
//     → JSON.stringify
//   '{"created_at":"2026-06-26T14:00:00.000Z","id":"abc-123"}'
//     → Buffer.from(...).toString('base64url')
//   "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNi..."
//
// WHY base64url (not plain base64)?
// Standard Base64 uses +, /, and = characters.
// These are special characters in URLs:
//   + is interpreted as a space
//   / conflicts with URL path separators
//   = is the query parameter assignment operator
//
// base64url replaces them:
//   + → -
//   / → _
//   = → (omitted, padding is optional)
//
// This means our cursor is safe to use directly in:
//   GET /api/products?cursor=eyJjcmVhdGVkX2F0Ijoi...
// No URL encoding needed. No %2F or %3D clutter.
// ─────────────────────────────────────────────────────────────
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

// ─────────────────────────────────────────────────────────────
// decodeCursor
// ─────────────────────────────────────────────────────────────
//
// Takes an opaque Base64 string and returns a CursorPayload,
// or null if the string is invalid.
//
// WHY does it return null instead of throwing?
//
// This is a deliberate design decision. The cursor utility is
// a PURE function — it should not make business decisions.
// "What to do when the cursor is invalid" is a business rule:
//   - Return 400? That's the service's decision.
//   - Use defaults? That's also the service's decision.
//   - Log a warning? That's the middleware's decision.
//
// By returning null, we say: "I couldn't decode this. You
// decide what to do." The service layer checks for null and
// throws an AppError(400, 'INVALID_CURSOR', ...).
//
// This keeps the utility reusable — a different module might
// handle invalid cursors differently.
//
// WHAT can go wrong?
// 1. The string is not valid Base64 → Buffer.from produces garbage
// 2. The decoded string is not valid JSON → JSON.parse throws
// 3. The JSON doesn't have the expected fields → validation fails
// 4. The fields have wrong types → validation fails
//
// All four cases return null.
// ─────────────────────────────────────────────────────────────
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    // Step 1: Decode Base64 → UTF-8 string
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');

    // Step 2: Parse JSON string → JavaScript object
    const parsed: unknown = JSON.parse(json);

    // Step 3: Validate the shape.
    // We can't trust that the parsed object is a CursorPayload.
    // The client could send anything. We must verify manually.
    //
    // WHY manual validation instead of Zod here?
    // Zod is ~30KB. This function is 3 lines of checks.
    // Using Zod for two field checks would be like using
    // a sledgehammer to hang a picture frame. The cursor
    // format is stable and simple — manual checks are fine.
    if (!isValidCursorShape(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    // JSON.parse failed, or Buffer.from produced garbage.
    // Either way, the cursor is invalid.
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// isValidCursorShape (type guard)
// ─────────────────────────────────────────────────────────────
//
// A TypeScript "type guard" — a function that returns a boolean
// but also NARROWS the type. After calling this, TypeScript
// knows that `value` is a CursorPayload (not `unknown`).
//
// WHY a separate function?
// 1. Readability — the decode function stays clean.
// 2. Reusability — can be used independently if needed.
// 3. Type narrowing — TypeScript understands the `is` keyword.
//
// WHAT does it check?
// - Is it a non-null object? (not a string, number, or null)
// - Does it have a 'created_at' property that's a string?
// - Does it have an 'id' property that's a string?
//
// We do NOT validate whether created_at is a valid ISO date
// or whether id is a valid UUID here. That's SEMANTIC
// validation, which belongs in the service layer. This
// function only checks STRUCTURAL validity.
// ─────────────────────────────────────────────────────────────
function isValidCursorShape(value: unknown): value is CursorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'created_at' in value &&
    'id' in value &&
    typeof (value as CursorPayload).created_at === 'string' &&
    typeof (value as CursorPayload).id === 'string'
  );
}
