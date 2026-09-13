// Converts application and Express errors into consistent JSON error responses.
import type { ErrorRequestHandler } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error instanceof Error && "status" in error ? error.status : undefined;
  const statusCode = error instanceof ApiError
    ? error.statusCode
    : typeof status === "number" && status >= 400 && status < 500 ? status : 500;
  const message = statusCode >= 500 && env.NODE_ENV === "production"
    ? "Internal server error"
    : error instanceof Error ? error.message : "Internal server error";

  if (statusCode >= 500) {
    logger.error("Request failed", {
      method: req.method,
      path: req.path,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: error instanceof ApiError ? error.errors : [],
  });
};
