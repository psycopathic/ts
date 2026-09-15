// Configures Express middleware, a health endpoint, and centralized error handling.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import commentRoutes from "./modules/comments/comments.routes";
import { ApiError } from "./utils/ApiError";
import { ApiResponse } from "./utils/ApiResponse";
import { asyncHandler } from "./utils/asyncHandler";

export const app = express();

app.disable("x-powered-by"); // x-powered-by header can be used to identify the backend framework, which can be a security risk.
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true })); // credentials: allow the refresh-token cookie cross-origin
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new ApiError(429, "Too many requests. Please try again later.")),
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", asyncHandler(async (_req, res) => {
  res.status(200).json(new ApiResponse(200, { status: "ok" }, "Server is running"));
}));

app.use("/api/auth", authRoutes);
app.use("/api/comments", commentRoutes);

app.use(asyncHandler(async () => {
  throw new ApiError(404, "Route not found");
}));
app.use(errorHandler);
