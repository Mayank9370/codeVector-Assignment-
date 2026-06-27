// ─────────────────────────────────────────────────────────────
// Product Module — Controller Layer
// ─────────────────────────────────────────────────────────────
//
// WHY this layer exists:
// - Standardizes Express-specific HTTP input and output mappings.
// - Keeps the HTTP tier isolated from business logic or SQL queries.
// - Forwards downstream errors cleanly to Express's global error handler.
//
// Inputs:
// - Express Request, Response, and NextFunction context.
// Outputs:
// - Sends HTTP status 200 with standard successResponse wrapper.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { ProductQueryParams } from './product.types';
import { successResponse } from '../../utils/apiResponse';

export const productController = {
  /**
   * HTTP endpoint to browse products with pagination.
   *
   * Query params (limit, category, cursor) are already validated
   * and coerced by the validateQuery middleware.
   */
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract validated, typesafe query parameters
      // Cast is safe because validateQuery guarantees the shape matching ProductQueryParams
      const { category, limit, cursor } = req.query as unknown as ProductQueryParams;

      // 2. Invoke Business Logic Service
      const result = await productService.getProducts({ category, limit, cursor });

      // 3. Send HTTP 200 OK using standard success wrapper
      res.status(200).json(successResponse(result));
    } catch (error) {
      // 4. Forward errors down to global error handler
      next(error);
    }
  },
};
