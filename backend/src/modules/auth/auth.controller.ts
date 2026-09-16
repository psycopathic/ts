// HTTP handlers for auth routes: validate input, call the auth service and shape the response.
import type { CookieOptions, Request } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import * as authService from "./auth.services";
import type { AuthUser } from "./auth.services";

const REFRESH_COOKIE = "refreshToken";

const registerSchema = z.object({
  name: z.string().trim().min(3),
  email: z.email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
});

const verifyEmailSchema = z.object({ token: z.string().min(1) });
const forgotPasswordSchema = z.object({ email: z.email() });
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});
const googleCallbackSchema = z.object({ code: z.string().min(1) });
const twoFactorCodeSchema = z.object({ code: z.string().min(1) });

const parse = <T extends z.ZodType>(schema: T, data: unknown): z.output<T> => {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(400, "Invalid data!", result.error.issues);
  return result.data;
};

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Set by the requireAuth middleware.
type AuthenticatedRequest = Request & { user?: AuthUser };

const getAuthUser = (req: Request): AuthUser => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new ApiError(401, "Not authenticated");
  return user;
};

export const registerUser = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(parse(registerSchema, req.body));
  res.status(201).json(new ApiResponse(201, { user }, "User registered"));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = parse(verifyEmailSchema, req.query);
  const alreadyVerified = await authService.verifyEmail(token);
  const message = alreadyVerified
    ? "Email is already verified"
    : "Email is now verified! You can login";
  res.status(200).json(new ApiResponse(200, null, message));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.loginUser(
    parse(loginSchema, req.body),
  );
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions,
    maxAge: authService.REFRESH_TOKEN_MAX_AGE_MS,
  });
  res.status(200).json(new ApiResponse(200, { accessToken, user }, "Login successfully done"));
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== "string" || !token) {
    throw new ApiError(401, "Refresh token is missing");
  }
  const { accessToken, refreshToken, user } = await authService.refreshSession(token);
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions,
    maxAge: authService.REFRESH_TOKEN_MAX_AGE_MS,
  });
  res.status(200).json(new ApiResponse(200, { accessToken, user }, "Token refreshed"));
});

export const logoutHandler = asyncHandler(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.status(200).json(new ApiResponse(200, null, "Logged out"));
});

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const { email } = parse(forgotPasswordSchema, req.body);
  await authService.requestPasswordReset(email);
  res
    .status(200)
    .json(
      new ApiResponse(200, null, "If an account with this email exists, we will send you a reset link"),
    );
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const { token, password } = parse(resetPasswordSchema, req.body);
  await authService.resetPassword(token, password);
  res.status(200).json(new ApiResponse(200, null, "Password reset successfully!"));
});

export const googleAuthStartHandler = asyncHandler(async (_req, res) => {
  res.redirect(authService.getGoogleAuthUrl());
});

export const googleAuthCallbackHandler = asyncHandler(async (req, res) => {
  const { code } = parse(googleCallbackSchema, req.query);
  const { accessToken, refreshToken, user } = await authService.loginWithGoogle(code);
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions,
    maxAge: authService.REFRESH_TOKEN_MAX_AGE_MS,
  });
  res.status(200).json(new ApiResponse(200, { accessToken, user }, "Google login successfully"));
});

export const twoFASetupHandler = asyncHandler(async (req, res) => {
  const { id } = getAuthUser(req);
  const { otpAuthUrl, secret } = await authService.setupTwoFactor(id);
  res.status(200).json(new ApiResponse(200, { otpAuthUrl, secret }, "2FA setup is done"));
});

export const twoFAVerifyHandler = asyncHandler(async (req, res) => {
  const { id } = getAuthUser(req);
  const { code } = parse(twoFactorCodeSchema, req.body);
  await authService.verifyTwoFactor(id, code);
  res
    .status(200)
    .json(new ApiResponse(200, { twoFactorEnabled: true }, "2FA enabled successfully"));
});
