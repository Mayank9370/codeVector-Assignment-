// ─────────────────────────────────────────────────────────────
// Standardized API response helpers.
//
// WHY: Every endpoint should return the same shape.
// The frontend team can write ONE response handler:
//   if (response.success) { use response.data }
//   else { show response.error.message }
//
// Without this, one endpoint returns { data: [...] },
// another returns { products: [...] }, a third returns
// the array directly. The frontend becomes a mess.
// ─────────────────────────────────────────────────────────────

/**
 * Shape of a successful API response.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Shape of a failed API response.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Build a success response object.
 *
 * Usage in a controller:
 *   res.json(successResponse(products));
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Build an error response object.
 *
 * Used by the global error handler — controllers don't call this directly.
 */
export function errorResponse(code: string, message: string, details?: unknown): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}
