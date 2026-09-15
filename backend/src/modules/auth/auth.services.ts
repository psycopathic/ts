// Business logic for authentication: credentials, sessions, email flows, Google OAuth and 2FA.
import { OAuth2Client } from "google-auth-library";
import { generateSecret, generateURI, verify } from "otplib";
import { env } from "../../config/env";
import { sendEmail } from "../../lib/email";
import { checkPassword, generateRandomToken, hashPassword, hashToken } from "../../lib/hash";
import {
  createAccessToken,
  createEmailVerifyToken,
  createRefreshToken,
  verifyAccessToken,
  verifyEmailVerifyToken,
  verifyRefreshToken,
} from "../../lib/token";
import { ApiError } from "../../utils/ApiError";
import { logger } from "../../utils/logger";
import {
  createUser,
  enableTwoFactor,
  findUserByEmail,
  findUserById,
  findUserByResetToken,
  markEmailVerified,
  setResetPasswordToken,
  setTwoFactorSecret,
  updatePassword,
  type PublicUser,
  type UserRole,
} from "./auth.repositories";

export { REFRESH_TOKEN_MAX_AGE_MS } from "../../lib/token";

const RESET_PASSWORD_TTL_MS = 15 * 60 * 1000;
const TWO_FACTOR_ISSUER = "NodeAdvancedAuthApp";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const getAppUrl = () => env.APP_URL ?? `http://localhost:${env.PORT}`;

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const toAuthUser = (user: PublicUser): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  twoFactorEnabled: user.twoFactorEnabled,
});

const createSession = (user: PublicUser): AuthSession => ({
  accessToken: createAccessToken(user.id, user.role, user.tokenVersion),
  refreshToken: createRefreshToken(user.id, user.tokenVersion),
  user: toAuthUser(user),
});

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "23505";

const requireGoogleEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    logger.error(`${name} environment variable is not set.`);
    throw new ApiError(500, `${name} is not configured`);
  }
  return value;
};

// ---------- register / verify email ----------

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> => {
  const email = normalizeEmail(input.email);
  if (await findUserByEmail(email)) {
    throw new ApiError(409, "User already exists!");
  }

  let user: PublicUser;
  try {
    user = await createUser({
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
    });
  } catch (error) {
    // Two concurrent sign-ups with the same email: the UNIQUE constraint wins.
    if (isUniqueViolation(error)) throw new ApiError(409, "User already exists!");
    throw error;
  }

  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${createEmailVerifyToken(user.id)}`;
  await sendEmail(
    user.email,
    "Verify your email",
    `<p>Please verify your email by clicking this link:</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  );

  return toAuthUser(user);
};

// Returns true if the email was already verified before this call.
export const verifyEmail = async (token: string): Promise<boolean> => {
  const payload = verifyEmailVerifyToken(token);
  if (!payload) throw new ApiError(400, "Invalid or expired verification token");

  const user = await findUserById(payload.userId);
  if (!user) throw new ApiError(400, "User not found");
  if (user.isEmailVerified) return true;

  await markEmailVerified(user.id);
  return false;
};

// ---------- login / refresh ----------

export const loginUser = async (input: {
  email: string;
  password: string;
  twoFactorCode?: string | undefined;
}): Promise<AuthSession> => {
  const user = await findUserByEmail(normalizeEmail(input.email));
  if (!user || !(await checkPassword(input.password, user.passwordHash))) {
    throw new ApiError(400, "Invalid email or password");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  if (user.twoFactorEnabled) {
    if (!input.twoFactorCode) throw new ApiError(400, "Two factor code is required");
    if (!user.twoFactorSecret) throw new ApiError(400, "Two factor is misconfigured for this account");

    // otplib v13 verify() is async; it must be awaited or every code passes.
    const { valid } = await verify({ secret: user.twoFactorSecret, token: input.twoFactorCode });
    if (!valid) throw new ApiError(400, "Invalid two factor code");
  }

  return createSession(user);
};

export const refreshSession = async (refreshToken: string): Promise<AuthSession> => {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new ApiError(401, "Invalid refresh token");

  const user = await findUserById(payload.userId);
  if (!user) throw new ApiError(401, "User not found");
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, "Refresh token invalidated");
  }

  return createSession(user);
};

// For the requireAuth middleware: resolves a Bearer access token to the current user.
export const authenticateAccessToken = async (accessToken: string): Promise<AuthUser> => {
  const payload = verifyAccessToken(accessToken);
  if (!payload) throw new ApiError(401, "Invalid token");

  const user = await findUserById(payload.userId);
  if (!user) throw new ApiError(401, "User not found");
  if (user.tokenVersion !== payload.tokenVersion) throw new ApiError(401, "Token invalidated");

  return toAuthUser(user);
};

// ---------- password reset ----------

// Silently does nothing for unknown emails so the endpoint can't be used to enumerate accounts.
export const requestPasswordReset = async (rawEmail: string): Promise<void> => {
  const user = await findUserByEmail(normalizeEmail(rawEmail));
  if (!user) return;

  const rawToken = generateRandomToken();
  await setResetPasswordToken(user.id, hashToken(rawToken), new Date(Date.now() + RESET_PASSWORD_TTL_MS));

  const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${rawToken}`;
  await sendEmail(
    user.email,
    "Reset your password",
    `<p>You requested a password reset. Click the link below to set a new password:</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>`,
  );
};

export const resetPassword = async (token: string, password: string): Promise<void> => {
  const user = await findUserByResetToken(hashToken(token));
  if (!user) throw new ApiError(400, "Invalid or expired token");

  // Also clears the reset token and bumps token_version (logs out all sessions).
  await updatePassword(user.id, await hashPassword(password));
};

// ---------- Google OAuth ----------

const getGoogleClient = () =>
  new OAuth2Client({
    clientId: requireGoogleEnv(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
    clientSecret: requireGoogleEnv(env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET"),
    redirectUri: `${getAppUrl()}/api/auth/google/callback`,
  });

export const getGoogleAuthUrl = (): string =>
  getGoogleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
  });

export const loginWithGoogle = async (code: string): Promise<AuthSession> => {
  const client = getGoogleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new ApiError(400, "No Google id_token is present");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: requireGoogleEnv(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(400, "Google email account is not verified");
  }

  const email = normalizeEmail(payload.email);
  const existing = await findUserByEmail(email);

  if (!existing) {
    const user = await createUser({
      email,
      passwordHash: await hashPassword(generateRandomToken(16)),
      name: payload.name ?? null,
      isEmailVerified: true,
    });
    return createSession(user);
  }

  if (!existing.isEmailVerified) {
    // Whoever registered this unverified account never proved they own the email,
    // so drop their password (and sessions) before handing the account to the Google user.
    await updatePassword(existing.id, await hashPassword(generateRandomToken(16)));
    await markEmailVerified(existing.id);
    const refreshed = await findUserById(existing.id);
    if (!refreshed) throw new ApiError(404, "User not found");
    return createSession(refreshed);
  }

  return createSession(existing);
};

// ---------- two-factor auth ----------

export const setupTwoFactor = async (
  userId: number,
): Promise<{ otpAuthUrl: string; secret: string }> => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");
  // Re-running setup would silently disable active 2FA without a code.
  if (user.twoFactorEnabled) throw new ApiError(400, "2FA is already enabled");

  const secret = generateSecret();
  const otpAuthUrl = generateURI({ issuer: TWO_FACTOR_ISSUER, label: user.email, secret });
  await setTwoFactorSecret(user.id, secret);

  return { otpAuthUrl, secret };
};

export const verifyTwoFactor = async (userId: number, code: string): Promise<void> => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (!user.twoFactorSecret) throw new ApiError(400, "You don't have 2FA set up yet");

  const { valid } = await verify({ secret: user.twoFactorSecret, token: code });
  if (!valid) throw new ApiError(400, "Invalid two factor code");

  await enableTwoFactor(user.id);
};
