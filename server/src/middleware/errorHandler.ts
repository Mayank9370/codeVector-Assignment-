import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { errorResponse } from '../utils/apiResponse';
import { env } from '../config/environment';

// ─────────────────────────────────────────────────────────────
// Global error-handling middleware.
//
// WHY THIS IS SPECIAL:
// Express recognizes error-handling middleware by its signature:
// it has FOUR parameters (err, req, res, next) instead of three.
// This is how Express knows to route errors here.
//
// HOW IT WORKS:
// When any middleware or route calls next(error) or throws an
// error, Express skips all remaining normal middleware and
// jumps directly to the first error-handling middleware.
//
// This means no matter where the error occurs — validation,
// service, repository — it ends up here, and the client
// always gets a consistent JSON error response.
// ─────────────────────────────────────────────────────────────
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // ─────────────────────────────────────────────────────────
  // Case 1: Known application error (we threw it ourselves).
  // We know the status code, error code, and message.
  // ─────────────────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
    return;
  }

  // ─────────────────────────────────────────────────────────
  // Case 2: Unknown error (something unexpected).
  //
  // WHY we log the full error but send a generic message:
  // - The full error (with stack trace) goes to server logs
  //   where developers can investigate.
  // - The client gets a safe, generic message. We NEVER send
  //   stack traces to clients — they reveal internal file
  //   paths, library versions, and database details.
  //   That's a security vulnerability.
  // ─────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.error('🔴 Unhandled error:', err);

  const message = env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred';

  res.status(500).json(errorResponse('INTERNAL_ERROR', message));
}
