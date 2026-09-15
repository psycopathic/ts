// Creates a lazy PostgreSQL connection pool for database queries.
import { Pool, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      logger.error("DATABASE_URL environment variable is not set.");
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
};

export const connectDatabase = async () => {
  await getPool().connect();
  logger.info("Connected to database");
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  return getPool().query<T>(text, params);
};

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database connection pool closed");
  }
}

export const disconnectDatabase = closePool;
