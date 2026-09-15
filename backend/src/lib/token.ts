// Signs and verifies JWTs. Each token carries a `type` claim so one kind can't be used as another.
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

export type UserRole = "user" | "admin";
type TokenType = "access" | "refresh" | "verify-email";

export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const requireSecret = (value: string | undefined, name: string): string => {
  if (!value) {
    logger.error(`${name} environment variable is not set.`);
    throw new ApiError(500, `${name} is not configured`);
  }
  return value;
};

const accessSecret = () => requireSecret(env.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET");
const refreshSecret = () => requireSecret(env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET");

const sign = (
  type: TokenType,
  userId: number,
  secret: string,
  expiresIn: "30m" | "7d" | "1h",
  claims: Record<string, unknown> = {},
) => jwt.sign({ ...claims, type }, secret, { subject: String(userId), expiresIn, algorithm: "HS256" });

// Returns null for any invalid, expired or wrong-type token.
const read = (token: string, secret: string, type: TokenType) => {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
  if (typeof decoded === "string" || decoded.type !== type || typeof decoded.sub !== "string") {
    return null;
  }
  const userId = Number(decoded.sub);
  if (!Number.isInteger(userId)) return null;
  return { userId, decoded };
};

const readVersioned = (token: string, secret: string, type: TokenType) => {
  const result = read(token, secret, type);
  if (!result || typeof result.decoded.tokenVersion !== "number") return null;
  return { userId: result.userId, tokenVersion: result.decoded.tokenVersion as number };
};

export const createAccessToken = (userId: number, role: UserRole, tokenVersion: number) =>
  sign("access", userId, accessSecret(), "30m", { role, tokenVersion });

export const createRefreshToken = (userId: number, tokenVersion: number) =>
  sign("refresh", userId, refreshSecret(), "7d", { tokenVersion });

export const createEmailVerifyToken = (userId: number) =>
  sign("verify-email", userId, accessSecret(), "1h");

export const verifyAccessToken = (token: string) => readVersioned(token, accessSecret(), "access");

export const verifyRefreshToken = (token: string) => readVersioned(token, refreshSecret(), "refresh");

export const verifyEmailVerifyToken = (token: string) => {
  const result = read(token, accessSecret(), "verify-email");
  return result ? { userId: result.userId } : null;
};
