// ─────────────────────────────────────────────────────────────
// Generic Request Validation Middleware
// ─────────────────────────────────────────────────────────────
//
// A higher-order function (factory) that takes a Zod schema
// and returns Express middleware. The middleware validates
// req.query against the schema.
//
// WHY is this file in middleware/ and not in modules/products/?
// Because it contains ZERO product-specific logic. It works
// with ANY Zod schema — products, brands, orders, users.
// It belongs to the infrastructure layer, not a feature module.
//
// HOW other modules reuse it:
//   Products: validateQuery(productQuerySchema)
//   Brands:   validateQuery(brandQuerySchema)
//   Orders:   validateQuery(orderQuerySchema)
//
// The middleware code never changes. Only the schema changes.
// This is the Open/Closed Principle in action.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/appError';

// ─────────────────────────────────────────────────────────────
// validateQuery
// ─────────────────────────────────────────────────────────────
//
// Factory function that creates a middleware for validating
// req.query against a Zod schema.
//
// GENERIC TYPE PARAMETER: <T>
//
//   T represents the OUTPUT type of the Zod schema — the shape
//   of the data AFTER parsing and transforms.
//
//   For productQuerySchema, T would be:
//     { cursor?: string; limit: number; category?: string }
//
//   The generic isn't strictly required at runtime (Zod handles
//   the parsing regardless), but it gives us TYPE SAFETY:
//   TypeScript knows that after this middleware runs,
//   req.query has the shape T — not Record<string, string>.
//
// WHY does it return a function (not directly validate)?
//
//   Because Express middleware must have the signature:
//     (req, res, next) => void
//
//   But we also need to pass in the schema. We can't do both
//   in one function call. So we use a factory:
//
//     validateQuery(schema)  ← configure with schema
//       → returns (req, res, next)  ← Express-compatible middleware
//
//   This is the same pattern Express itself uses:
//     express.json()      ← factory call
//       → returns middleware  ← the actual function Express runs
// ─────────────────────────────────────────────────────────────
export function validateQuery<T>(schema: ZodSchema<T>) {

  // ─────────────────────────────────────────────────────────
  // This is the actual middleware function that Express calls
  // for every matching request.
  //
  // The schema is captured in the closure — it was passed to
  // the outer function and is "remembered" by the inner function.
  // This is a JavaScript closure: the inner function has access
  // to the outer function's variables even after the outer
  // function has returned.
  // ─────────────────────────────────────────────────────────
  return (req: Request, _res: Response, next: NextFunction): void => {

    // ─────────────────────────────────────────────────────────
    // safeParse vs parse
    //
    // schema.parse(data) → throws ZodError on failure
    // schema.safeParse(data) → returns { success, data, error }
    //
    // WHY safeParse?
    // With parse(), we'd need a try/catch, and we'd be catching
    // ZodError specifically. safeParse gives us a clean result
    // object — no exception handling, no type narrowing of the
    // caught error. It's more explicit and predictable.
    // ─────────────────────────────────────────────────────────
    const result = schema.safeParse(req.query);

    // ─────────────────────────────────────────────────────────
    // FAILURE PATH: validation failed.
    //
    // We create an AppError with:
    //   - 400 status (Bad Request — the client sent invalid data)
    //   - 'VALIDATION_ERROR' code (machine-readable for frontend)
    //   - Human-readable message
    //   - Zod's error details (array of { path, message } objects)
    //
    // Then we call next(error).
    //
    // WHY next(error) and not res.status(400).json(...)?
    // Because next(error) sends the error to our centralized
    // errorHandler middleware. That handler formats ALL errors
    // consistently. If we sent the response here, we'd have
    // two different places defining the error JSON shape.
    //
    // WHY do we flatten the errors?
    // Zod's raw error object is deeply nested. The flatten()
    // method produces a simpler structure:
    //   { fieldErrors: { limit: ["must be at least 1"] } }
    // This is much more useful for frontend form validation —
    // they can map each error to the corresponding input field.
    // ─────────────────────────────────────────────────────────
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid query parameters',
          fieldErrors,
        ),
      );
      return;
    }

    // ─────────────────────────────────────────────────────────
    // SUCCESS PATH: validation passed.
    //
    // WHY overwrite req.query?
    //
    // Before validation:
    //   req.query = { limit: "20", category: "  electronics  " }
    //   Types: Record<string, string | string[] | undefined>
    //
    // After validation:
    //   req.query = { limit: 20, category: "electronics" }
    //   Types: { limit: number, category?: string }
    //
    // Overwriting req.query means the controller reads the
    // PARSED, TYPED values — not the raw strings. The controller
    // never needs to know that limit was originally a string.
    //
    // WHY the `as any` cast?
    // Express types req.query as ParsedQs (a string-based type).
    // After Zod parsing, our data has numbers and properly typed
    // optionals. TypeScript won't let us assign a { limit: number }
    // to a ParsedQs without a cast. This is one of the few places
    // where `as any` is justified — we're deliberately overriding
    // Express's default typing with our validated, stricter typing.
    //
    // The controller will read req.query and cast it to the
    // correct type (ValidatedProductQuery / ProductQueryParams).
    // That cast is safe because the middleware guarantees the
    // shape matches.
    // ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.query = result.data as any;

    // ─────────────────────────────────────────────────────────
    // Pass control to the next middleware (the controller).
    //
    // Calling next() WITHOUT an argument means "everything is
    // fine, continue to the next handler."
    // Calling next(error) WITH an argument means "something
    // went wrong, skip to the error handler."
    // ─────────────────────────────────────────────────────────
    next();
  };
}
