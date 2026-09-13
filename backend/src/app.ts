// Configures Express middleware, a health endpoint, and centralized error handling.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { ApiError } from "./utils/ApiError";
import { ApiResponse } from "./utils/ApiResponse";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new ApiError(429, "Too many requests. Please try again later.")),
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json(new ApiResponse(200, { status: "ok" }, "Server is running"));
});

app.use((_req, _res, next) => next(new ApiError(404, "Route not found")));
app.use(errorHandler);
