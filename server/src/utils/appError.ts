// ─────────────────────────────────────────────────────────────
// Custom error class for the entire application.
//
// WHY a custom class?
// A standard Error only has a `message`. But our error handler
// needs to know:
//   - What HTTP status code to send (400? 404? 500?)
//   - A machine-readable error code (VALIDATION_ERROR, NOT_FOUND)
//   - Optional details (like Zod validation issues)
//
// By extending Error, we can throw AppError anywhere in the
// codebase and the global error handler knows exactly what
// to do with it.
//
// WHY does it extend Error?
// So it works with try/catch, has a stack trace, and behaves
// like a normal Error in every way — just with extra fields.
// ─────────────────────────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    // Call the parent Error constructor with the message.
    // This sets this.message and this.stack.
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // ─────────────────────────────────────────────────────────
    // Fix the prototype chain.
    //
    // WHY: When you extend a built-in class (Error, Array, Map)
    // in TypeScript, `instanceof` can break without this line.
    // This is a TypeScript/ES5 compilation quirk.
    // Without it: `error instanceof AppError` might return false.
    // ─────────────────────────────────────────────────────────
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
