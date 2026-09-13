// Starts the HTTP server and closes HTTP/database connections during shutdown.
import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./config/db";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
});

server.on("error", (error) => {
  logger.error("HTTP server error", error);
  process.exit(1);
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}; shutting down`);

  const timeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  timeout.unref();

  server.close(async (error) => {
    try {
      await pool.end();
      if (error) throw error;
      clearTimeout(timeout);
      process.exitCode = 0;
    } catch (shutdownError) {
      logger.error("Shutdown failed", shutdownError);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
