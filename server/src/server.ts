import app from './app';
import { env, testConnection, closePool } from './config';

// ─────────────────────────────────────────────────────────────
// Server entry point.
//
// This is the file that `npm run dev` and `npm start` execute.
// It does three things:
//   1. Verify the database is reachable (fail-fast).
//   2. Start the HTTP server.
//   3. Set up graceful shutdown handlers.
//
// WHY an async IIFE (Immediately Invoked Function Expression)?
// Top-level await requires "type": "module" in package.json,
// which can cause compatibility issues with some libraries.
// An async IIFE is the safest, most compatible pattern.
// ─────────────────────────────────────────────────────────────
(async () => {
  try {
    // ─────────────────────────────────────────────────────────
    // Step 1: Verify database connection BEFORE accepting traffic.
    //
    // WHY: If the database is unreachable, we want to know NOW —
    // not when the first user hits the API. This is fail-fast
    // at the infrastructure level.
    //
    // Common failures caught here:
    //   - Wrong DATABASE_URL
    //   - Database server is down
    //   - Network/firewall blocking the connection
    //   - SSL configuration mismatch
    // ─────────────────────────────────────────────────────────
    // eslint-disable-next-line no-console
    console.log('⏳ Verifying database connection...');
    await testConnection();
    // eslint-disable-next-line no-console
    console.log('✅ Database connected successfully');

    // ─────────────────────────────────────────────────────────
    // Step 2: Start the HTTP server.
    //
    // We store the server reference so we can close it during
    // graceful shutdown. Without this reference, we can't
    // stop accepting new connections.
    // ─────────────────────────────────────────────────────────
    const server = app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
      // eslint-disable-next-line no-console
      console.log(`   Environment: ${env.NODE_ENV}`);
      // eslint-disable-next-line no-console
      console.log(`   Health check: http://localhost:${env.PORT}/health`);
    });

    // ─────────────────────────────────────────────────────────
    // Step 3: Graceful shutdown.
    //
    // WHY: When the process receives a termination signal:
    //
    //   SIGTERM → Sent by Kubernetes, Docker, Heroku, Railway
    //             when deploying a new version. Means:
    //             "Please shut down cleanly."
    //
    //   SIGINT  → Sent when you press Ctrl+C in the terminal.
    //             Same meaning, just triggered manually.
    //
    // Without graceful shutdown:
    //   - Active HTTP requests get abruptly terminated (users see errors)
    //   - Database connections are severed mid-query (potential data corruption)
    //   - Connection pool isn't drained (PostgreSQL shows "zombie" connections)
    //
    // With graceful shutdown:
    //   1. server.close() stops accepting NEW connections
    //   2. In-flight requests finish normally
    //   3. closePool() drains database connections cleanly
    //   4. process.exit(0) exits with success code
    // ─────────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      // eslint-disable-next-line no-console
      console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

      // Stop accepting new HTTP connections.
      // Existing connections are allowed to finish.
      server.close(async () => {
        // eslint-disable-next-line no-console
        console.log('   ✅ HTTP server closed');

        // Drain all database connections.
        await closePool();
        // eslint-disable-next-line no-console
        console.log('   ✅ Database pool closed');

        // eslint-disable-next-line no-console
        console.log('   👋 Goodbye!\n');
        process.exit(0);
      });

      // ─────────────────────────────────────────────────────
      // Safety timeout: if shutdown takes more than 10 seconds,
      // force exit. This prevents the process from hanging
      // indefinitely if a connection won't close.
      // ─────────────────────────────────────────────────────
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error('⚠️  Shutdown timeout — forcing exit');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    // ─────────────────────────────────────────────────────────
    // If database connection fails at startup, log and exit.
    // The deployment pipeline sees exit code 1 and knows the
    // deploy failed.
    // ─────────────────────────────────────────────────────────
    // eslint-disable-next-line no-console
    console.error('🔴 Failed to start server:', error);
    process.exit(1);
  }
})();
