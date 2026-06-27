import express from 'express';
import { env } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './modules/health/health.router';
import { productRouter } from './modules/products/product.router';

// ─────────────────────────────────────────────────────────────
// Express application factory.
//
// WHY is this a separate file from server.ts?
//
// server.ts calls app.listen() — it starts the real HTTP server.
// app.ts CREATES the configured Express app but does NOT start it.
//
// This separation exists for TESTING:
//   - In tests, you import `app` and pass it to supertest.
//     supertest spins up a temporary server on a random port.
//     No port conflicts. No real server running.
//   - In production, server.ts imports `app` and calls listen().
//
// If app creation and server startup were in the same file,
// importing the app would immediately start listening — you
// can't test without a real server, and parallel tests would
// fight over ports.
// ─────────────────────────────────────────────────────────────

const app = express();

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE — ORDER MATTERS!
//
// 1. Request logger   → logs every request (even failed ones)
// 2. JSON parser      → parses request bodies as JSON
// 3. CORS handling    → allows the React frontend to call us
// 4. Routes           → the actual API endpoints
// 5. Error handler    → catches all errors (MUST BE LAST)
// ─────────────────────────────────────────────────────────────

// 1. Log every incoming request.
app.use(requestLogger);

// 2. Parse JSON request bodies.
// WHY express.json()? Without it, req.body is undefined.
// The { limit: '10mb' } prevents someone from sending a
// 1GB JSON body and crashing the server (denial of service).
app.use(express.json({ limit: '10mb' }));

// 3. CORS — allow the React frontend to call this API.
// WHY manual CORS instead of the cors package?
// The cors package is fine, but for an internship assignment,
// writing it manually teaches you what CORS actually is:
// the browser blocks cross-origin requests unless the server
// sends specific headers saying "this origin is allowed."
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight requests: the browser sends an OPTIONS request
  // before the actual GET/POST. We respond with 204 (no content)
  // to say "yes, this origin is allowed."
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// ─────────────────────────────────────────────────────────────
// ROUTES
//
// WHY the /api prefix?
// If the frontend is served from the same domain, /api clearly
// separates API routes from frontend routes. It also makes
// reverse proxy configuration trivial:
//   /api/* → backend server
//   /*     → frontend static files
// ─────────────────────────────────────────────────────────────

app.use('/health', healthRouter);

// Product routes
app.use('/api/products', productRouter);

// ─────────────────────────────────────────────────────────────
// ERROR HANDLER — must be registered AFTER all routes.
//
// Express error-handling middleware has 4 parameters:
//   (err, req, res, next)
// This is how Express distinguishes it from regular middleware.
// If we registered it before routes, it would never catch
// route errors because errors flow DOWNWARD through the
// middleware stack.
// ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
