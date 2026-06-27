// ─────────────────────────────────────────────────────────────
// Product Module — Router Layer
// ─────────────────────────────────────────────────────────────
//
// WHY this layer exists:
// - Declares the routing configurations for products.
// - Connects the GET route endpoint to the validation middleware and controller.
// - Keeps endpoint mapping declarative, clean, and documentation-friendly.
//
// Endpoints registered:
// - GET /  -> productController.getProducts (with query parameter validation)
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { productController } from './product.controller';
import { validateQuery } from '../../middleware/validateRequest';
import { productQuerySchema } from './product.validator';

const router = Router();

/**
 * Route: GET /api/products
 *
 * Pipeline:
 *  1. validateQuery - Validates and coerces req.query using Zod productQuerySchema.
 *  2. productController.getProducts - Handles input delegation and JSON response formatting.
 */
router.get('/', validateQuery(productQuerySchema), productController.getProducts);

export { router as productRouter };
