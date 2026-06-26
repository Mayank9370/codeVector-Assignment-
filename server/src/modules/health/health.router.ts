import { Router, Request, Response } from 'express';
import { testConnection } from '../../config';
import { successResponse, errorResponse } from '../../utils/apiResponse';

// ─────────────────────────────────────────────────────────────
// Health check route.
//
// WHY do health endpoints exist?
//
// 1. LOAD BALANCERS (AWS ALB, Nginx, Kubernetes) call this
//    endpoint every few seconds. If it returns 200, the
//    instance is "healthy" and receives traffic. If it
//    returns 500, the load balancer stops sending traffic
//    and optionally restarts the instance.
//
// 2. MONITORING TOOLS (UptimeRobot, Datadog) alert your
//    team when this endpoint stops responding.
//
// 3. DEPLOYMENT PIPELINES check this after deploying a new
//    version. If health fails, the deploy is rolled back.
//
// 4. DEVELOPERS use it to verify the server and database
//    are running after a fresh setup.
//
// WHY check the database?
// A server can be "running" (Express is listening) but
// "unhealthy" (database connection is dead). The health
// check distinguishes between the two.
// ─────────────────────────────────────────────────────────────

const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Verify the database is reachable.
    await testConnection();

    res.status(200).json(
      successResponse({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    // Database is unreachable — report unhealthy.
    // We still return JSON (not a crash) so monitoring
    // tools can parse the response.
    res.status(503).json(
      errorResponse(
        'SERVICE_UNAVAILABLE',
        'Database connection failed',
      ),
    );
  }
});

export default healthRouter;
