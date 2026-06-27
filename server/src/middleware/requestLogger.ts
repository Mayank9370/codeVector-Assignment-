import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

// ─────────────────────────────────────────────────────────────
// Request logger middleware.
//
// WHY: When something goes wrong in production, the first
// question is always "what requests were made?"
//
// This middleware logs:
//   - HTTP method (GET, POST, etc.)
//   - URL path
//   - Response status code
//   - How long the request took
//
// Example output:
//   GET /api/products 200 12ms
//   GET /api/products?category=electronics 400 2ms
//
// WHY not use a library like morgan?
// Morgan is fine for production. But for an internship
// assignment, writing your own teaches you how middleware
// works. Plus, it's 15 lines — not worth a dependency.
// ─────────────────────────────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip logging in test environment to keep test output clean.
  if (env.NODE_ENV === 'test') {
    next();
    return;
  }

  const start = Date.now();

  // ─────────────────────────────────────────────────────────
  // res.on('finish') fires AFTER the response has been sent.
  // This is when we know the status code and can calculate
  // the duration. We can't log before this because we
  // don't yet know if it'll be a 200, 400, or 500.
  // ─────────────────────────────────────────────────────────
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // eslint-disable-next-line no-console
    console.log(`${method} ${originalUrl} ${statusCode} ${duration}ms`);
  });

  // Pass control to the next middleware.
  next();
}
