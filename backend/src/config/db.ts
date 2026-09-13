// Creates a lazy PostgreSQL connection pool for database queries.
import { Pool } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  logger.error("Unexpected PostgreSQL pool error", { error: error.message, stack: error.stack });
});
