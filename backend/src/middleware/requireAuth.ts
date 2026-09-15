// Requires a valid Bearer access token and attaches the authenticated user to req.user.
import type { NextFunction, Request, Response } from "express";
import { authenticateAccessToken, type AuthUser } from "../modules/auth/auth.services";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is missing");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  (req as Request & { user?: AuthUser }).user = await authenticateAccessToken(token);
  next();
});
